/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';
var phosphor_disposable_1 = require('phosphor-disposable');
var extension_1 = require('./extension');
/**
 * Implementation of a Plugin.
 */
var Plugin = (function () {
    /**
     * Construct a new plugin.
     */
    function Plugin(name, options) {
        this._name = '';
        this._module = '';
        this._initializer = '';
        this._extensionPoints = null;
        this._extensions = null;
        this._disposables = null;
        this._module = name + '/' + options.module;
        this._name = name;
        this._initializer = options.initializer;
        if (options.extensionPoints) {
            this._extensionPoints = options.extensionPoints.slice();
        }
        if (options.extensions) {
            this._extensions = options.extensions.slice();
        }
        this._disposables = new phosphor_disposable_1.DisposableSet();
    }
    Object.defineProperty(Plugin.prototype, "isDisposed", {
        /**
         * Whether the plugin has been disposed.
         */
        get: function () {
            return this._disposables.isDisposed;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Dispose of the resources held by the plugin.
     */
    Plugin.prototype.dispose = function () {
        this._extensions = null;
        this._extensionPoints = null;
        this._disposables.dispose();
    };
    /**
     * Load the plugin.
     */
    Plugin.prototype.load = function () {
        var _this = this;
        var promises = [];
        if (this._extensionPoints) {
            this._extensionPoints.map(function (point) {
                promises.push(_this._loadExtensionPoint(point));
            });
        }
        if (this._extensions) {
            this._extensions.map(function (ext) {
                promises.push(_this._loadExtension(ext));
            });
        }
        return Promise.all(promises).then(function () { return _this._initialize.bind(_this); });
    };
    /**
     * Load an extension point.
     */
    Plugin.prototype._loadExtensionPoint = function (point) {
        var _this = this;
        if (point.hasOwnProperty('module') || (point.module)) {
            point.module = this._name + '/' + point.module;
        }
        else {
            point.module = this._module;
        }
        return extension_1.loadExtensionPoint(point).then(function (result) {
            if (result.hasOwnProperty('dispose')) {
                _this._disposables.add(result);
            }
        }).catch(function (error) { console.error(error); });
    };
    /**
     * Load an extension.
     */
    Plugin.prototype._loadExtension = function (extension) {
        var _this = this;
        if (extension.hasOwnProperty('module') || (extension.module)) {
            extension.module = this._name + '/' + extension.module;
        }
        else {
            extension.module = this._module;
        }
        if (extension.hasOwnProperty('data') || (extension.data)) {
            extension.data = this._name + '/' + extension.data;
        }
        return extension_1.loadExtension(extension).then(function (result) {
            if (result.hasOwnProperty('dispose')) {
                _this._disposables.add(result);
            }
        }).catch(function (error) { console.error(error); });
    };
    /**
     * Initialize the plugin.
     */
    Plugin.prototype._initialize = function () {
        var _this = this;
        this._extensionPoints = [];
        this._extensions = [];
        if (this._initializer) {
            return System.import(this._module).then(function (mod) {
                var initializer = mod[_this._initializer];
                var disposable = initializer();
                if (disposable.hasOwnProperty('dispose')) {
                    _this._disposables.add(disposable);
                }
            }).catch(function (error) { console.error(error); });
        }
        else {
            return Promise.resolve(void 0);
        }
    };
    return Plugin;
})();
/**
 * Get a list of available plugin names.
 */
function listPlugins() {
    return Array.from(availablePlugins.keys());
}
exports.listPlugins = listPlugins;
/**
 * Fetch the available plugins.
 *
 * Can be called more than once to update the available plugins.
 */
function fetchPlugins() {
    if (availablePlugins) {
        System.delete('package.json!npm');
        return System.import('package.json!npm').then(gatherPlugins);
    }
    else {
        availablePlugins = new Map();
        return gatherPlugins();
    }
    ;
}
exports.fetchPlugins = fetchPlugins;
/**
 * Load a plugin by name.
 *
 * Load all extension points and extensions, then call `initialize`.
 *
 * Throws an error if the plugin is not in the registry.
 */
function loadPlugin(name) {
    var plugin = availablePlugins.get(name);
    if (!plugin)
        throw Error('Plugin not in registry');
    availablePlugins.delete(name);
    loadedPlugins.set(name, plugin);
    return plugin.load();
}
exports.loadPlugin = loadPlugin;
/**
 * Unload a plugin by name, disposing of its resources.
 *
 * This is a no-op if the plugin has not been loaded or has already
 * been unloaded.
 */
function unloadPlugin(name) {
    var plugin = loadedPlugins.get(name);
    if (plugin)
        plugin.dispose();
}
exports.unloadPlugin = unloadPlugin;
/**
 * Gather all available plugins.
 *
 * This is a no-op if the plugins have already been gathered.
 */
function gatherPlugins() {
    var promises = [];
    getPluginNames().map(function (name) {
        promises.push(loadPackage(name));
    });
    return Promise.all(promises).then(function () { });
}
/**
 * Get a list of all plugin names.
 */
function getPluginNames() {
    var names = [];
    // fetch the metadata about available packages
    Object.keys(System.npm).map(function (key) {
        var obj = System.npm[key];
        if ((availablePlugins.get(name)) || (loadedPlugins.get(name))) {
            return;
        }
        // check for one occurrence of `node_modules` in the fileUrl
        var fileUrl = obj.fileUrl;
        var index = fileUrl.indexOf('node_modules');
        var lastIndex = fileUrl.lastIndexOf('node_modules');
        if (index > 0 && index === lastIndex) {
            names.push(obj.name);
        }
    });
    return names;
}
/**
 * Load a package by name and add to plugin registry if valid plugin.
 */
function loadPackage(name) {
    return System.import(name + '/package.json').then(function (config) {
        addPackage(name, config);
    }).catch(function (error) { console.error(error); });
}
/**
 * Add a package to the registry if valid.
 */
function addPackage(name, config) {
    if (config.hasOwnProperty('phosphor-plugin')) {
        var pconfig = config["phosphor-plugin"];
        pconfig.module = pconfig.module || config.main;
        availablePlugins.set(name, new Plugin(name, pconfig));
    }
}
// Map of available plugins by name.
var availablePlugins = new Map();
// map of loaded plugins by name.
var loadedPlugins = new Map();
//# sourceMappingURL=plugin.js.map