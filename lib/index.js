/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';
/**
 * Get a list of available plugin names.
 */
function listPlugins(reload) {
    if (reload === void 0) { reload = false; }
    return new Promise(function (resolve, reject) {
        if (reload) {
            System.delete('package.json!npm');
            pluginReg = null;
            System.import('package.json!npm').then(function () {
                gatherPlugins().then(function () {
                    resolve(Array.from(pluginReg.keys()));
                }, reject);
            }, reject);
        }
        else {
            gatherPlugins().then(function () {
                resolve(Array.from(pluginReg.keys()));
            }, reject);
        }
    });
}
exports.listPlugins = listPlugins;
/**
 * Load a plugin by name.
 *
 * Load all extension points and extensions, then call `initialize`.
 *
 * Throws an error if the plugin is not in the registry.
 */
function loadPlugin(name) {
    return new Promise(function (resolve, reject) {
        gatherPlugins().then(function () {
            var plugin = pluginReg.get(name);
            if (!plugin)
                reject(Error('Plugin not in registry'));
            System.import(name + '/' + plugin.main).then(function (mod) {
                var promises = [];
                // load all extension points and extensions
                if (plugin.hasOwnProperty('extensionPoints')) {
                    plugin.extensionPoints.map(function (point) {
                        promises.push(loadExtensionPoint(name, mod, point));
                    });
                }
                if (plugin.hasOwnProperty('extensions')) {
                    plugin.extensions.map(function (ext) {
                        promises.push(loadExtension(name, mod, ext));
                    });
                }
                Promise.all(promises).then(function () {
                    // initialize the plugin
                    if (mod.hasOwnProperty('initialize')) {
                        var disposable = mod.initialize();
                        if (disposable && disposable.hasOwnProperty('dispose')) {
                            var disposables = disposableReg.get(name) || [];
                            disposables.push(disposable);
                            disposableReg.set(name, disposables);
                        }
                    }
                    resolve(void 0);
                }, reject);
            }, reject);
        }, reject);
    });
}
exports.loadPlugin = loadPlugin;
/**
 * Unload a plugin by name, disposing of its resources.
 *
 * This is a no-op if the plugin has not been loaded or has already
 * been unloaded.
 */
function unloadPlugin(name) {
    var disposables = disposableReg.get(name) || [];
    disposables.map(function (disposable) {
        try {
            disposable.dispose();
        }
        catch (e) {
            console.error(e);
        }
    });
}
exports.unloadPlugin = unloadPlugin;
/**
 * Gather all available plugins.
 *
 * This is a no-op if the plugins have already been gathered.
 */
function gatherPlugins() {
    if (pluginReg !== null) {
        return Promise.resolve(void 0);
    }
    pluginReg = new Map();
    var promises = [];
    // fetch the metadata about available plugins
    Object.keys(System.npm).map(function (key) {
        var obj = System.npm[key];
        // check for one occurrence of `node_modules` in the fileUrl
        var fileUrl = obj.fileUrl;
        var index = fileUrl.indexOf('node_modules');
        var lastIndex = fileUrl.lastIndexOf('node_modules');
        if (index > 0 && index === lastIndex) {
            promises.push(loadPackage(obj.name));
        }
    });
    return Promise.all(promises).then(function () { return void 0; });
}
/**
 * Load a package by name and add to plugin registry if valid plugin.
 */
function loadPackage(name) {
    return System.import(name + '/package.json').then(function (config) {
        if ((config.hasOwnProperty('phosphide')) &&
            (config.phosphide.hasOwnProperty('main'))) {
            var pconfig = config.phosphide;
            var plugin = { main: pconfig.main };
            if (pconfig.hasOwnProperty('extensionPoints')) {
                var points = [];
                pconfig.extensionPoints.map(function (point) {
                    if ((point.hasOwnProperty('id')) &&
                        (point.hasOwnProperty('receiver'))) {
                        points.push(point);
                    }
                });
                plugin.extensionPoints = points;
            }
            if (pconfig.hasOwnProperty('extensions')) {
                plugin.extensions = pconfig.extensions;
            }
            pluginReg.set(name, plugin);
        }
    }).catch(function (error) {
        console.error('Failed to load plugin: ' + name);
        console.error(error);
    });
}
/**
 * Load an extension point and any existing extensions matching the point.
 */
function loadExtensionPoint(name, mod, point) {
    return new Promise(function (resolve, reject) {
        var receiver = mod[point.receiver];
        extensionPointReg.set(point.id, receiver);
        var extensions = extensionReg.get(point.id);
        if (extensions) {
            var promises = [];
            extensions.map(function (pExt) {
                promises.push(connectExtension(name, receiver, pExt));
            });
            Promise.all(promises).then(function () { return resolve(void 0); });
        }
        resolve(void 0);
    }).catch(function (error) {
        console.error('Failed to load extension point: ' + point.id);
        console.error(error);
    });
}
/**
 * Load an extension.
 *
 * If the extenstion point exists, finish loading.
 * Otherwise, store the partially loaded extension point.
 */
function loadExtension(name, mod, ext) {
    return new Promise(function (resolve, reject) {
        if (ext.loader) {
            var loader = mod[ext.loader];
        }
        else {
            var loader = null;
        }
        var pExt = {
            loader: loader,
            data: ext.data,
            config: ext.config,
        };
        var receiver = extensionPointReg.get(ext.point);
        if (receiver) {
            connectExtension(name, receiver, pExt).then(resolve, reject);
        }
        else {
            var pExts = extensionReg.get(ext.point) || [];
            pExts.push(pExt);
            extensionReg.set(ext.point, pExts);
            resolve(void 0);
        }
    }).catch(function (error) {
        console.error('Failed to load extension: ' + name + ' to ' + ext.point);
        console.error(error);
    });
}
/**
 * Connect an extension to its extension point.
 *
 * First loads JSON data and loader function, if given.
 */
function connectExtension(name, receiver, pExt) {
    return new Promise(function (resolve, reject) {
        var promises = [];
        var ext = {
            data: null,
            object: null,
            config: pExt.config || null
        };
        // check for json data to load
        if ((pExt.data !== void 0) && (pExt.data.indexOf('.json') > 0)) {
            promises.push(System.import(name + '/' + pExt.data).then(function (data) {
                ext.data = data;
            }));
        }
        // check for a loader function
        if (pExt.loader) {
            promises.push(pExt.loader().then(function (obj) { ext.object = obj; }));
        }
        Promise.all(promises).then(function () {
            var disposable = receiver(ext);
            if (disposable && disposable.hasOwnProperty('dispose')) {
                var disposables = disposableReg.get(name) || [];
                disposables.push(disposable);
                disposableReg.set(name, disposables);
            }
            resolve(void 0);
        }, reject);
    });
}
// Map of plugins by name.
var pluginReg = null;
// Map of extension points by point id.
var extensionPointReg = new Map();
// Map of partial extensions by point id.
var extensionReg = new Map();
// Map of disposables by plugin.
var disposableReg = new Map();
//# sourceMappingURL=index.js.map