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
function listPlugins() {
    return gatherPlugins().then(function () {
        return Array.from(pluginReg.keys());
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
    return gatherPlugins().then(function () {
        var plugin = pluginReg.get(name);
        if (!plugin)
            throw Error('Plugin not in registry');
        return System.import(name + '/' + plugin.main).then(function (mod) {
            var promises = [];
            // load all extension points and extensions
            if (plugin.hasOwnProperty('extensionPoints')) {
                plugin.extensionPoints.map(function (point) {
                    promises.push(loadExtensionPoint(name, mod, point));
                });
            }
            if (plugin.hasOwnProperty('extensions')) {
                console.log('has extensions');
                plugin.extensions.map(function (ext) {
                    promises.push(loadExtension(name, mod, ext));
                });
            }
            console.log('waiting for', promises.length, 'promises');
            return Promise.all(promises).then(function () {
                console.log('initializing here', name);
                // initialize the plugin
                if (mod.hasOwnProperty('initialize')) {
                    var disposable = mod.initialize();
                    var disposables = disposableReg.get(name) || [];
                    disposables.push(disposable);
                    disposableReg.set(name, disposables);
                }
            }).catch(function () {
                console.log('unknown failure');
            });
        });
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
    for (var key in System.npmPaths) {
        var obj = System.npmPaths[key];
        // check for one occurrence of `node_modules` in the fileUrl
        var fileUrl = obj.fileUrl;
        var index = fileUrl.indexOf('node_modules');
        var lastIndex = fileUrl.lastIndexOf('node_modules');
        if (index > 0 && index === lastIndex) {
            promises.push(loadPackage(obj.name));
        }
    }
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
    }).catch(function () {
        console.warn('Failed to load plugin: ' + name);
    });
}
/**
 * Load an extension point and any existing extensions matching the point.
 */
function loadExtensionPoint(name, mod, point) {
    return new Promise(function (resolve, reject) {
        var receiver = mod[point.receiver];
        extensionPointReg.set(point.id, receiver);
        console.log('load extension point');
        var extensions = extensionReg.get(point.id);
        if (extensions) {
            var promises = [];
            extensions.map(function (pExt) {
                promises.push(handleExtension(name, receiver, pExt));
            });
            return Promise.all(promises).then(function () { return resolve(void 0); });
        }
        console.log('load extension point done', name);
        resolve();
    }).catch(function () {
        console.warn('Failed to load extension point: ' + point.id);
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
            handleExtension(name, receiver, pExt).then(resolve);
        }
        else {
            var pExts = extensionReg.get(ext.point) || [];
            pExts.push(pExt);
            extensionReg.set(ext.point, pExts);
            resolve(void 0);
        }
    }).catch(function (error) {
        console.warn('Failed to load extension: ' + name + ' to ' + ext.point);
        console.log(error);
    });
}
/**
 * Continue loading an extension to the extension point.
 *
 * This is an intermediate step to handle optionally loading json data.
 */
function handleExtension(name, receiver, pExt) {
    // check for json data to load
    return new Promise(function (resolve, reject) {
        if ((pExt.data !== void 0) && (pExt.data.indexOf('.json') > 0)) {
            System.import(name + '/' + pExt.data).then(function (data) {
                pExt.data = data;
                resolve(finishExtension(name, receiver, pExt));
            });
        }
        else {
            return resolve(finishExtension(name, receiver, pExt));
        }
    });
}
/**
 * Actually load the extension and store the disposable.
 */
function finishExtension(name, receiver, pExt) {
    console.log('finish extension', name);
    var object = null;
    if (pExt.loader) {
        object = pExt.loader();
    }
    var ext = {
        data: pExt.data || null,
        object: object,
        config: pExt.config || null
    };
    var disposable = receiver(ext);
    var disposables = disposableReg.get(name) || [];
    disposables.push(disposable);
    disposableReg.set(name, disposables);
    console.log('done finishing extension', name);
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