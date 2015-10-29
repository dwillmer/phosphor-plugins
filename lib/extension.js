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
 * Implementation of an Extension Point.
 */
var ExtensionPoint = (function () {
    /**
     * Construct a new extension point.
     */
    function ExtensionPoint(options) {
        this._id = '';
        this._receiver = '';
        this._module = '';
        this._initializer = '';
        this._initialized = false;
        this._receiverFunc = null;
        this._disposables = null;
        this._id = options.id;
        this._receiver = options.receiver;
        this._module = options.module;
        this._initializer = options.initializer;
        this._disposables = new phosphor_disposable_1.DisposableSet();
    }
    Object.defineProperty(ExtensionPoint.prototype, "isDisposed", {
        /**
         * Whether the extension point has been disposed.
         */
        get: function () {
            return this._disposables.isDisposed;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Dispose of the resources held by the extension point.
     */
    ExtensionPoint.prototype.dispose = function () {
        allExtensionPoints.delete(this._id);
        this._receiverFunc = null;
        this._disposables.dispose();
    };
    /**
     * Connect an extension to the extension point.
     */
    ExtensionPoint.prototype.connect = function (extension) {
        var _this = this;
        console.log('connecting to', this._id);
        if (!this._initialized) {
            return this._load().then(function () { return _this._connectExtension(extension); });
        }
        else {
            return this._connectExtension(extension);
        }
    };
    /**
     * Load the extension point.
     */
    ExtensionPoint.prototype._load = function () {
        var _this = this;
        return System.import(this._module).then(function (mod) {
            _this._receiverFunc = mod[_this._receiver].bind(_this);
            return _this._initialize();
        });
    };
    /**
     * Initialize the extension point.
     */
    ExtensionPoint.prototype._initialize = function () {
        var _this = this;
        if ((this._initialized) || (!this._initializer)) {
            this._initialized = true;
            return Promise.resolve(void 0);
        }
        this._initialized = true;
        return System.import(this._module).then(function (mod) {
            return mod[_this._initializer]().then(function (result) {
                if (result.hasOwnProperty('dispose')) {
                    _this._disposables.add(result);
                }
            });
        });
    };
    /**
     * Finish connecting and extension to the extension point.
     */
    ExtensionPoint.prototype._connectExtension = function (extension) {
        var _this = this;
        var receiver = this._receiverFunc;
        return extension.load().then(function (result) {
            var disposable = receiver(result);
            if (disposable.hasOwnProperty('dispose')) {
                _this._disposables.add(disposable);
            }
            return extension.initialize();
        });
    };
    return ExtensionPoint;
})();
/**
 * Implementation of an Extension.
 */
var Extension = (function () {
    /**
     * Construct a new Extension.
     */
    function Extension(options) {
        this._point = '';
        this._loader = '';
        this._module = '';
        this._data = '';
        this._initializer = '';
        this._extension = null;
        this._disposables = null;
        this._point = options.point;
        this._loader = options.loader;
        this._module = options.module;
        this._data = options.data;
        this._extension = {
            config: options.config,
            data: void 0,
            object: void 0
        };
        this._initializer = options.initializer;
        this._disposables = new phosphor_disposable_1.DisposableSet();
    }
    Object.defineProperty(Extension.prototype, "isDisposed", {
        /**
         * Whether the extension has been disposed.
         */
        get: function () {
            return this._disposables.isDisposed;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Dispose of the resources held by the extension.
     */
    Extension.prototype.dispose = function () {
        this._extension = null;
        this._disposables.dispose();
    };
    /**
     * Initialize the the extension.
     */
    Extension.prototype.initialize = function () {
        var _this = this;
        this._extension = null;
        if (this._initializer) {
            return System.import(this._module).then(function (mod) {
                var initializer = mod[_this._initializer];
                return initializer().then(function (disposable) {
                    if (disposable.hasOwnProperty('dispose')) {
                        _this._disposables.add(disposable);
                    }
                });
            });
        }
        else {
            return Promise.resolve(void 0);
        }
    };
    /**
     * Load the extension.
     */
    Extension.prototype.load = function () {
        var _this = this;
        return Promise.all([this._loadData(), this._loadObject()])
            .then(function () { return _this._extension; });
    };
    /**
     * Load the data for the extension.
     */
    Extension.prototype._loadData = function () {
        var _this = this;
        if (!this._data) {
            return Promise.resolve(void 0);
        }
        return System.import(this._data).then(function (data) {
            _this._extension.data = data;
        });
    };
    /**
     * Load the object for the extension.
     */
    Extension.prototype._loadObject = function () {
        var _this = this;
        if (!this._loader) {
            return Promise.resolve(void 0);
        }
        return System.import(this._module).then(function (mod) {
            var loader = mod[_this._loader];
            return loader().then(function (result) {
                _this._extension.object = result;
            });
        });
    };
    return Extension;
})();
/**
 * Load an extension point, connecting any existing matching extensions.
 */
function loadExtensionPoint(config) {
    var point = new ExtensionPoint(config);
    allExtensionPoints.set(config.id, point);
    var extensions = allExtensions.get(config.id);
    if (!extensions) {
        return Promise.resolve(point);
    }
    allExtensions.delete(config.id);
    var promises = [];
    extensions.map(function (ext) {
        promises.push(point.connect(ext));
    });
    return Promise.all(promises).then(function () { return point; });
}
exports.loadExtensionPoint = loadExtensionPoint;
/**
 * Load an extension, connecting to the corresponding extension point exists.
 */
function loadExtension(config) {
    var extension = new Extension(config);
    var point = allExtensionPoints.get(config.point);
    if (point) {
        return point.connect(extension).then(function () { return extension; });
    }
    var extensions = allExtensions.get(config.point) || [];
    extensions.push(extension);
    allExtensions.set(config.point, extensions);
    return Promise.resolve(extension);
}
exports.loadExtension = loadExtension;
// Map of available extension points by point id.
var allExtensionPoints = new Map();
// Map of available extensions by point id.
var allExtensions = new Map();
//# sourceMappingURL=extension.js.map