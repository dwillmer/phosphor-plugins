/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';
var phosphor_disposable_1 = require('phosphor-disposable');
/**
 * List the names of the currently registered plugins.
 *
 * @returns A new array of the current plugin names.
 */
function listPlugins() {
    return Object.keys(pluginRegistry);
}
exports.listPlugins = listPlugins;
/**
 * List the ids of the currently registered extensions.
 *
 * @returns A new array of the current extension ids.
 */
function listExtensions() {
    return Object.keys(extensionRegistry);
}
exports.listExtensions = listExtensions;
/**
 * List the ids of the currently registered extension points.
 *
 * @returns A new array of the current extension point ids.
 */
function listExtensionPoints() {
    return Object.keys(pointRegistry);
}
exports.listExtensionPoints = listExtensionPoints;
/**
 * Register a plugin and load its JSON specification.
 *
 * @param name - The name of the plugin to register.
 *
 * @returns A disposable which will unload the plugin.
 *
 * @throws An error if the plugin name is already registered.
 *
 * #### Notes
 * A plugin name is the same as the name of the package which contains
 * the plugin specification. For a plugin named `my-plugin`, this will
 * load the `my-plugin/package.json` file. The `phosphor-plugin` field
 * in that file will be used to configure the plugin.
 */
function registerPlugin(name) {
    // Throw an error if the plugin name is registered.
    if (name in pluginRegistry) {
        throw new Error("Plugin '" + name + "' is already registered.");
    }
    // Create a new unloaded record for the plugin.
    var record = {
        state: 0 /* Unloaded */,
        spec: null,
    };
    // Add the record to the plugin registry.
    pluginRegistry[name] = record;
    // Load the plugin record.
    loadPlugin(name, record);
    // Return a disposable which will unload the plugin.
    return new phosphor_disposable_1.DisposableDelegate(function () { disposePlugin(name); });
}
exports.registerPlugin = registerPlugin;
/**
 * Register an extension and connect the matching extension point.
 *
 * @param extension - The extension object to register.
 *
 * @returns A disposable which will unload the extension.
 *
 * @throws An error if the extension id is already registered.
 *
 * #### Notes
 * This function can be used to dynamically register an extension which
 * is created at runtime. Most extensions are registered automatically
 * as part of registering their owner plugin.
 */
function registerExtension(extension) {
    // Throw an error if the extension id is registered.
    if (extension.id in extensionRegistry) {
        throw new Error("Extension '" + extension.id + "' is already registered.");
    }
    // Create a compatible spec for the extension.
    var spec = {
        id: extension.id,
        point: extension.point,
        plugin: extension.plugin,
    };
    // Create a new loaded record for the extension.
    var record = {
        state: 2 /* Loaded */,
        spec: spec,
        value: extension,
        promise: null,
    };
    // Add the record to the extension registry.
    extensionRegistry[spec.id] = record;
    // Load any matching extension point.
    loadMatchingPoint(record);
    // Return a disposable which will unload the extension.
    return new phosphor_disposable_1.DisposableDelegate(function () { disposeExtension(spec.id); });
}
exports.registerExtension = registerExtension;
/**
 * Register an extension point and connect the matching extensions.
 *
 * @param point - The extension point object to register.
 *
 * @returns A disposable which will unload the extension point.
 *
 * @throws An error if the extension point id is already registered.
 *
 * #### Notes
 * This function can be used to dynamically register an extension point
 * which is created at runtime. Most extension points are registered
 * automatically as part of registering their owner plugin.
 */
function registerExtensionPoint(point) {
    // Throw an error if the extension point id is registered.
    if (point.id in pointRegistry) {
        throw new Error("Extension point '" + point.id + "' is already registered.");
    }
    // Create a compatible spec for the extension point.
    var spec = {
        id: point.id,
        plugin: point.plugin,
    };
    // Create a new loaded record for the extension.
    var record = {
        state: 2 /* Loaded */,
        spec: spec,
        value: point,
        promise: null,
    };
    // Add the record to the registry.
    pointRegistry[spec.id] = record;
    // Load any matching extensions.
    loadMatchingExtensions(record);
    // Return a disposable which will unload the extension point.
    return new phosphor_disposable_1.DisposableDelegate(function () { disposePoint(spec.id); });
}
exports.registerExtensionPoint = registerExtensionPoint;
/**
 * Create a new empty string map.
 */
function createMap() {
    return Object.create(null);
}
/**
 * Safely dispose a disposable.
 *
 * All errors will be caught and logged to the console.
 *
 * This function is null-safe.
 */
function safeDispose(obj) {
    try {
        if (obj)
            obj.dispose();
    }
    catch (err) {
        console.error(err);
    }
}
/**
 * Test whether loaded JSON data is an object.
 */
function isObject(jsonData) {
    if (!jsonData) {
        return false;
    }
    if (typeof jsonData !== 'object') {
        return false;
    }
    if (jsonData instanceof Array) {
        return false;
    }
    return true;
}
/**
 * Test whether an object has a given property.
 */
function hasProperty(obj, name) {
    return name in obj;
}
/**
 * Test whether an object has a given function.
 */
function hasFunction(obj, name) {
    return typeof obj[name] === 'function';
}
/**
 * Test whether an object implements `IDisposable`.
 */
function isDisposable(obj) {
    return hasProperty(obj, 'isDisposed') && hasFunction(obj, 'dispose');
}
/**
 * Test whether a non-null object implements `IContribution`.
 */
function isContribution(obj) {
    return hasProperty(obj, 'item') && isDisposable(obj);
}
/**
 * Test whether a non-null object implements `IReceiver`.
 */
function isReceiver(obj) {
    return hasFunction(obj, 'add') && hasFunction(obj, 'remove') && isDisposable(obj);
}
/**
 * A mapping of plugin name to plugin record.
 */
var pluginRegistry = createMap();
/**
 * Ensure a plugin record is fully loaded.
 */
function loadPlugin(name, record) {
    // If the record is not unloaded, there is nothing to do.
    if (record.state !== 0 /* Unloaded */) {
        return;
    }
    // Set the record state to loading.
    record.state = 1 /* Loading */;
    // Kick off the promise loading chain.
    Promise.resolve().then(function () {
        // Load the plugin package JSON.
        return System.import(name + "/package.json");
    }).then(function (pkg) {
        // Do nothing if the record has been disposed.
        if (record.state === 3 /* Disposed */) {
            return;
        }
        // Assert the package JSON data is an object.
        if (!isObject(pkg)) {
            throw new Error('`package.json` must be an object.');
        }
        // Assert the plugin JSON data exists.
        if (!('phosphor-plugin' in pkg)) {
            throw new Error('`phosphor-plugin` is not specified.');
        }
        // Create the plugin spec from the plugin JSON data.
        record.spec = createPluginSpec(name, pkg['phosphor-plugin']);
        record.state = 2 /* Loaded */;
        // Register the plugin extension points.
        for (var _i = 0, _a = record.spec.extensionPoints; _i < _a.length; _i++) {
            var point = _a[_i];
            registerPointSpec(point);
        }
        // Register the plugin extensions.
        for (var _b = 0, _c = record.spec.extensions; _b < _c.length; _b++) {
            var ext = _c[_b];
            registerExtensionSpec(ext);
        }
    }).catch(function (err) {
        // If an error occurs while loading, log it to the console.
        console.error("Error occured while loading plugin '" + name + "':", err);
        // Unregister the plugin and mark it as disposed.
        delete pluginRegistry[name];
        record.state = 3 /* Disposed */;
    });
}
/**
 * Dispose of the plugin with the specified name.
 */
function disposePlugin(name) {
    // Do nothing if the name is not registered.
    if (!(name in pluginRegistry)) {
        return;
    }
    // Delete the registration record.
    var record = pluginRegistry[name];
    delete pluginRegistry[name];
    // Do nothing if the record is disposed or unloaded.
    if (record.state === 3 /* Disposed */ ||
        record.state === 0 /* Unloaded */) {
        return;
    }
    // If the record is loading, mark it as disposed. The loader
    // will check for this condition and handle it on completion.
    if (record.state === 1 /* Loading */) {
        record.state = 3 /* Disposed */;
        return;
    }
    // Mark the plugin as disposed.
    record.state = 3 /* Disposed */;
    // Dispose the plugin extensions.
    for (var _i = 0, _a = record.spec.extensions; _i < _a.length; _i++) {
        var ext = _a[_i];
        disposeExtension(ext.id);
    }
    // Dispose the plugin extension points.
    for (var _b = 0, _c = record.spec.extensionPoints; _b < _c.length; _b++) {
        var point = _c[_b];
        disposePoint(point.id);
    }
}
/**
 * Create a plugin spec from plugin JSON data.
 *
 * This will throw error if any part of the data is invalid.
 */
function createPluginSpec(name, plugin) {
    // Assert the plugin is an object.
    if (!isObject(plugin)) {
        throw new Error('Plugin must be an object.');
    }
    // Create the extension specs for the plugin.
    var extensions = createExtensionSpecs();
    // Create the point specs for the plugin.
    var extensionPoints = createPointSpecs();
    // Return the new plugin spec.
    return { name: name, extensions: extensions, extensionPoints: extensionPoints };
    // Create the array of extension specs.
    function createExtensionSpecs() {
        if (!('extensions' in plugin)) {
            return [];
        }
        if (!(plugin.extensions instanceof Array)) {
            throw new Error('`extensions` must be an array.');
        }
        return plugin.extensions.map(createExtensionSpec);
    }
    // Create the array of extension point specs.
    function createPointSpecs() {
        if (!('extensionPoints' in plugin)) {
            return [];
        }
        if (!(plugin.extensionPoints instanceof Array)) {
            throw new Error('`extensionPoints` must be an array.');
        }
        return plugin.extensionPoints.map(createPointSpec);
    }
    // Create an extension spec from extension JSON data.
    function createExtensionSpec(ext) {
        if (!isObject(ext)) {
            throw new Error('Extension must be an object.');
        }
        if (typeof ext.id !== 'string') {
            throw new Error('Extension `id` must be a string.');
        }
        if (typeof ext.point !== 'string') {
            throw new Error('Extension `point` must be a string.');
        }
        var spec = { id: ext.id, point: ext.point, plugin: name };
        if ('main' in ext) {
            if (typeof ext.main !== 'string') {
                throw new Error('Extension `main` must be a string.');
            }
            spec.main = ext.main;
        }
        if ('factory' in ext) {
            if (typeof ext.factory !== 'string') {
                throw new Error('Extension `factory` must be a string.');
            }
            spec.factory = ext.factory;
        }
        if ('data' in ext) {
            if (typeof ext.data !== 'string') {
                throw new Error('Extension `data` must be a string.');
            }
            spec.data = ext.data;
        }
        if ('config' in ext) {
            if (!isObject(ext.config)) {
                throw new Error('Extension `config` must be an object.');
            }
            spec.config = ext.config;
        }
        return spec;
    }
    // Create a point spec from point JSON data.
    function createPointSpec(point) {
        if (!isObject(point)) {
            throw new Error('Extension point must be an object.');
        }
        if (typeof point.id !== 'string') {
            throw new Error('Extension point `id` must be a string.');
        }
        var spec = { id: point.id, plugin: name };
        if ('main' in point) {
            if (typeof point.main !== 'string') {
                throw new Error('Extension point `main` must be a string.');
            }
            spec.main = point.main;
        }
        if ('factory' in point) {
            if (typeof point.factory !== 'string') {
                throw new Error('Extension point `factory` must be a string.');
            }
            spec.factory = point.factory;
        }
        return spec;
    }
}
//-----------------------------------------------------------------------------
// Extension Implementation
//-----------------------------------------------------------------------------
/**
 * A concrete implementation of `IExtension`.
 */
var Extension = (function () {
    /**
     * Construct a new extension.
     *
     * @param id - The globally unique identifier of the extension.
     *
     * @param point - The identifier of the target extension point.
     *
     * @param plugin - The name of the plugin which owns the extension.
     *
     * @param contrib - The contribution for the extension, or `null`.
     *
     * @param data - The parsed JSON data for the extension, or `null`.
     *
     * @param config - The static configuration data, or `null`.
     */
    function Extension(id, point, plugin, contrib, data, config) {
        this._disposed = false;
        this._id = id;
        this._point = point;
        this._plugin = plugin;
        this._data = data || null;
        this._config = config || null;
        this._contrib = contrib || null;
    }
    /**
     * Create a new extension from a spec, contribution, and data.
     *
     * @param spec - The specification for the extension.
     *
     * @param contrib - The contribution for the extension, or `null`.
     *
     * @param data - The parsed JSON data for the extension, or `null`.
     *
     * @returns A new extension instance.
     */
    Extension.create = function (spec, contrib, data) {
        return new Extension(spec.id, spec.point, spec.plugin, contrib, data, spec.config);
    };
    /**
     * Dispose of the resources held by the extension.
     */
    Extension.prototype.dispose = function () {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        var temp = this._contrib;
        this._data = null;
        this._config = null;
        this._contrib = null;
        safeDispose(temp);
    };
    Object.defineProperty(Extension.prototype, "isDisposed", {
        /**
         * Test whether the extension has been disposed.
         */
        get: function () {
            return this._disposed;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Extension.prototype, "id", {
        /**
         * The globally unique identifier of the extension.
         */
        get: function () {
            return this._id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Extension.prototype, "point", {
        /**
         * The identifier of the target extension point.
         */
        get: function () {
            return this._point;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Extension.prototype, "plugin", {
        /**
         * The name of the plugin which owns the extension.
         */
        get: function () {
            return this._plugin;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Extension.prototype, "item", {
        /**
         * The behavioral object for the extension, or `null`.
         */
        get: function () {
            return this._contrib ? this._contrib.item : null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Extension.prototype, "data", {
        /**
         * The parsed JSON data for the extension, or `null`.
         */
        get: function () {
            return this._data;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Extension.prototype, "config", {
        /**
         * The static configuration data for the extension, or `null`.
         */
        get: function () {
            return this._config;
        },
        enumerable: true,
        configurable: true
    });
    return Extension;
})();
/**
 * A mapping of extension id to extension record.
 */
var extensionRegistry = createMap();
/**
 * Register an extension spec and load the matching extension point.
 *
 * If the extension id is already registered, an error will be logged
 * and the registration will be ignored.
 */
function registerExtensionSpec(spec) {
    // Log an error if the extension id is already registered.
    if (spec.id in extensionRegistry) {
        console.error("Extension '" + spec.id + "' is already registered.");
        return;
    }
    // Create a new unloaded record for the extension.
    var record = {
        state: 0 /* Unloaded */,
        spec: spec,
        value: null,
        promise: null,
    };
    // Add the record to the extension registry.
    extensionRegistry[spec.id] = record;
    // Load the matching extension point.
    loadMatchingPoint(record);
}
/**
 * Ensure an extension record is fully loaded.
 *
 * It is possible for the the record to be disposed before the loader
 * promise is resolved, so the caller must validate the record state
 * after resolving the returned promise.
 */
function loadExtension(record) {
    console.log("Loading extension... " + record.spec.id);
    // If the record is disposed or loaded, there is nothing to do.
    if (record.state === 3 /* Disposed */ ||
        record.state === 2 /* Loaded */) {
        return Promise.resolve();
    }
    // If the record is still loading, return the pending promise.
    if (record.state === 1 /* Loading */) {
        return record.promise;
    }
    // Setup local variables.
    var spec = record.spec;
    var data = null;
    // Kick off the promise loading chain.
    var promise = Promise.resolve().then(function () {
        // Load the extension JSON data, if given. Extensions which
        // are manually registered will always have a null data file.
        return spec.data ? System.import(spec.plugin + "/" + spec.data) : null;
    }).then(function (argdata) {
        // Store the data for later use.
        data = argdata;
        // Load the main module for the extension. Extensions which
        // are manually registered will always have a null main module.
        return spec.main ? System.import(spec.plugin + "/" + spec.main) : null;
    }).then(function (main) {
        // If there is no factory, skip to the next step.
        if (!main || !spec.factory) {
            return null;
        }
        // Throw an error if the factory is not a function.
        var factory = main[spec.factory];
        if (typeof factory !== 'function') {
            throw new Error("Extension '" + spec.id + "' has invalid factory.");
        }
        // Load the result of the factory.
        return factory();
    }).then(function (contrib) {
        // Throw an error if the contribution interface is invalid.
        if (contrib && !isContribution(contrib)) {
            throw new Error("Extension '" + spec.id + "' has invalid contribution.");
        }
        // Clear the loader promise.
        record.promise = null;
        // If the record was disposed before reaching this point, release
        // the item. Otherwise, create the extension and update the record.
        if (record.state === 3 /* Disposed */) {
            safeDispose(contrib);
        }
        else {
            record.value = Extension.create(spec, contrib, data);
            record.state = 2 /* Loaded */;
        }
    }).catch(function (err) {
        // If an error occurs while loading, log it to the console.
        console.error("Error occured while loading extension '" + spec.id + "':", err);
        // Clear the loader promise.
        record.promise = null;
        // Unregister the extension and mark it as disposed.
        delete extensionRegistry[spec.id];
        record.state = 3 /* Disposed */;
    });
    // Update the record loading state.
    record.promise = promise;
    record.state = 1 /* Loading */;
    // Return the new loader promise.
    return promise;
}
/**
 * Dispose of the extension record with the specified id.
 */
function disposeExtension(id) {
    // Do nothing if the id is not registered.
    if (!(id in extensionRegistry)) {
        return;
    }
    // Delete the registration record.
    var record = extensionRegistry[id];
    delete extensionRegistry[id];
    // Do nothing if the record is disposed or unloaded.
    if (record.state === 3 /* Disposed */ ||
        record.state === 0 /* Unloaded */) {
        return;
    }
    // If the record is loading, mark it as disposed. The loader
    // will check for this condition and handle it on completion.
    if (record.state === 1 /* Loading */) {
        record.state = 3 /* Disposed */;
        return;
    }
    // Remove the extension from any matching extension point.
    var other = pointRegistry[record.spec.point];
    if (other && other.value)
        other.value.remove(id);
    // Dispose of the extension.
    record.state = 3 /* Disposed */;
    safeDispose(record.value);
}
//-----------------------------------------------------------------------------
// Extension Point Implementation
//-----------------------------------------------------------------------------
/**
 * A concrete implementation of `IExtensionPoint`.
 */
var ExtensionPoint = (function () {
    /**
     * Construct a new extension point.
     *
     * @param id - The globally unique id of the extension point.
     *
     * @param plugin - The name of plugin which owns the extension point.
     *
     * @param receiver - The receiver for the extension point, or `null`.
     */
    function ExtensionPoint(id, plugin, receiver) {
        this._disposed = false;
        console.log("CREATING EXT POINT: " + id);
        this._id = id;
        this._plugin = plugin;
        this._receiver = receiver || null;
    }
    /**
     * Create a new extension point from a spec and receiver.
     *
     * @param spec - The specification for the extension point.
     *
     * @param receiver - The receiver for the extension point, or `null`.
     */
    ExtensionPoint.create = function (spec, receiver) {
        return new ExtensionPoint(spec.id, spec.plugin, receiver);
    };
    /**
     * Dispose of the resources held by the extension point.
     */
    ExtensionPoint.prototype.dispose = function () {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        var temp = this._receiver;
        this._receiver = null;
        safeDispose(temp);
    };
    Object.defineProperty(ExtensionPoint.prototype, "isDisposed", {
        /**
         * Test whether the extension point has been disposed.
         */
        get: function () {
            return this._disposed;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ExtensionPoint.prototype, "id", {
        /**
         * The globally unique id of the extension point.
         */
        get: function () {
            return this._id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ExtensionPoint.prototype, "plugin", {
        /**
         * The name of the plugin which owns the extension point.
         */
        get: function () {
            return this._plugin;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Add an extension to the extension point.
     */
    ExtensionPoint.prototype.add = function (extension) {
        if (this._receiver)
            this._receiver.add(extension);
    };
    /**
     * Remove an extension from the extension point.
     */
    ExtensionPoint.prototype.remove = function (id) {
        if (this._receiver)
            this._receiver.remove(id);
    };
    return ExtensionPoint;
})();
/**
 * A mapping of extension point id to extension point record.
 */
var pointRegistry = createMap();
/**
 * Register an extension point spec and load any matching extensions.
 *
 * If the point id is already registered, an error will be logged
 * and the registration will be ignored.
 */
function registerPointSpec(spec) {
    // Log an error if the extension point id is already registered.
    if (spec.id in pointRegistry) {
        console.error("Extension point '" + spec.id + "' is already registered.");
        return;
    }
    // Create a new unloaded record for the point.
    var record = {
        state: 0 /* Unloaded */,
        spec: spec,
        value: null,
        promise: null,
    };
    // Add the record to the point registry.
    pointRegistry[spec.id] = record;
    // Load any matching extensions.
    loadMatchingExtensions(record);
}
/**
 * Ensure an extension point record is fully loaded.
 *
 * It is possible for the the record to be disposed before the loader
 * promise is resolved, so the caller must validate the record state
 * after resolving the returned promise.
 */
function loadPoint(record) {
    // If the record is disposed or loaded, there is nothing to do.
    if (record.state === 3 /* Disposed */ ||
        record.state === 2 /* Loaded */) {
        return Promise.resolve();
    }
    // If the record is still loading, return the pending promise.
    if (record.state === 1 /* Loading */) {
        return record.promise;
    }
    // Setup local variables.
    var spec = record.spec;
    // Kick off the loader promise chain.
    var promise = Promise.resolve().then(function () {
        // Load the main module for the extension point. Points which
        // are manually registered will always have a null main module.
        return spec.main ? System.import(spec.plugin + "/" + spec.main) : null;
    }).then(function (main) {
        // If there is no factory, skip to the next step.
        if (!main || !spec.factory) {
            return null;
        }
        // Throw an error if the factory is not a function.
        var factory = main[spec.factory];
        if (typeof factory !== 'function') {
            throw new Error("Extension point '" + spec.id + "' has invalid factory.");
        }
        // Load the result of the factory.
        return factory();
    }).then(function (receiver) {
        // Throw an error if the receiver interface is invalid.
        if (receiver && !isReceiver(receiver)) {
            throw new Error("Extension point '" + spec.id + "' has invalid receiver.");
        }
        // Clear the loader promise.
        record.promise = null;
        // If the record was disposed before reaching this point, release
        // the receiver. Otherwise, create the point and update the record.
        if (record.state === 3 /* Disposed */) {
            safeDispose(receiver);
        }
        else {
            record.value = ExtensionPoint.create(spec, receiver);
            record.state = 2 /* Loaded */;
        }
    }).catch(function (err) {
        // If an error occurs while loading, log it to the console.
        console.error("Error occured while loading point '" + spec.id + "':", err);
        // Clear the loader promise.
        record.promise = null;
        // Unregister the extension point and mark it as disposed.
        delete pointRegistry[spec.id];
        record.state = 3 /* Disposed */;
    });
    // Update the record loading state.
    record.promise = promise;
    record.state = 1 /* Loading */;
    // Return the new loader promise.
    return promise;
}
/**
 * Dispose of the extension point record with the specified id.
 */
function disposePoint(id) {
    // Do nothing if the id is not registered.
    if (!(id in pointRegistry)) {
        return;
    }
    // Delete the registration record.
    var record = pointRegistry[id];
    delete pointRegistry[id];
    // Do nothing if the record is disposed or unloaded.
    if (record.state === 3 /* Disposed */ ||
        record.state === 0 /* Unloaded */) {
        return;
    }
    // If the record is loading, mark it as disposed. The loader
    // will check for this condition and handle it on completion.
    if (record.state === 1 /* Loading */) {
        record.state = 3 /* Disposed */;
        return;
    }
    // Dispose of the extension point.
    record.state = 3 /* Disposed */;
    safeDispose(record.value);
}
//-----------------------------------------------------------------------------
// Extension Point Matching
//-----------------------------------------------------------------------------
/**
 * Load all matching extensions for the given point record.
 */
function loadMatchingExtensions(pRecord) {
    for (var key in extensionRegistry) {
        var eRecord = extensionRegistry[key];
        if (eRecord.spec.point === pRecord.spec.id) {
            loadMatch(pRecord, eRecord);
        }
    }
}
/**
 * Load the matching extension point for the given extension record.
 */
function loadMatchingPoint(eRecord) {
    var pRecord = pointRegistry[eRecord.spec.point];
    if (pRecord)
        loadMatch(pRecord, eRecord);
}
/**
 * Load and connect the matching point and extension records.
 */
function loadMatch(pRecord, eRecord) {
    var p1 = loadPoint(pRecord);
    var p2 = loadExtension(eRecord);
    Promise.all([p1, p2]).then(function () {
        var s1 = pRecord.state === 2 /* Loaded */;
        var s2 = eRecord.state === 2 /* Loaded */;
        if (s1 && s2)
            pRecord.value.add(eRecord.value);
    });
}
//# sourceMappingURL=index.js.map