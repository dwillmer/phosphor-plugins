/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  IDisposable, DisposableSet
} from 'phosphor-disposable';


/**
 * An object which provides the specification for an extension point.
 *
 * The extension point spec contains the information necessary for the
 * plugin system to lazily load and initialize the extension point when
 * matching extensions are registered.
 *
 * All properties of the spec should be treated as read-only.
 */
export
interface IExtensionPointSpec {
  /**
   * The globally unique id of the extension point.
   *
   * Uniqueness of the id is enforced when the spec is registered. To
   * minimize the possibility of conflicts and remain human-readable,
   * the id should use the format: `my-package:my-extension-point`.
   */
  id: string;

  /**
   * The path to the main module for the extension point.
   *
   * When the first matching extension is registered for the extension
   * point, the module will be imported via `System.import(spec.main)`.
   */
  main: string;

  /**
   * The name of the receiver function for the extension point.
   *
   * This is the name of a function in the [[main]] module which acts
   * as the receiver for the extension point. It is called whenever a
   * matching extension is loaded for the extension point. It takes a
   * single argument of `IExtension<T>` and returns an `IDisposable`,
   * which will be disposed when either of the extension point or the
   * extension are unloaded.
   *
   * The receiver function will never be invoked before the promise
   * returned by the [[initializer]] function (if given) is resolved.
   */
  receiver: string;

  /**
   * The name of the initializer function for the extension point.
   *
   * This is the name of a function in the [[main]] module which acts
   * as the initializer for the extension point. It is called with no
   * arguments and should return a `Promise<IDisposable>`, which will
   * be disposed when the extension point is unloaded.
   *
   * An extension point will not receive extensions until the promise
   * returned by the initializer resolves. This allows the extension
   * point to perform asynchronous setup after its module is loaded,
   * but before receiving extensions.
   */
  initializer?: string;
}


/**
 * An object which provides the specification for an extension.
 *
 * The extension spec contains the information necessary for the plugin
 * system to lazily load and initialize the extension when the matching
 * extension point is registered.
 *
 * All properties of the spec should be treated as read-only.
 */
export
interface IExtensionSpec {
  /**
   * The globally unique id of the extension.
   *
   * Uniqueness of the id is enforced when the spec is registered. To
   * minimize the possibility of conflicts and remain human-readable,
   * the id should use the format: `my-package:my-extension-point`.
   */
  id: string;

  /**
   * The id of the extension point to which the extension contributes.
   *
   * It is **not** necessary for the extension point to be registered
   * before the extension (or at all). If and when the extension point
   * is registered, the extension will be loaded.
   */
  point: string;

  /**
   * The path to the main module for the extension.
   *
   * When a matching extension point is registered, the module will
   * be imported via `System.import(spec.main)`.
   *
   * The main module does not need to be provided for extensions which
   * only contribute JSON data or configuration to an extension point.
   */
  main?: string;

  /**
   * The name of the initializer function for the extension.
   *
   * This is the name of a function in the [[main]] module which acts
   * as the initializer for the extension. It is called with no
   * arguments and should return a `Promise<IDisposable>`, which will
   * be disposed when the extension is unloaded.
   *
   * The extension will not load extension objects until the promise
   * returned by the initializer resolves. This allows the extension
   * to perform asynchronous setup after its module is loaded, but
   * before loading actual extension objects.
   */
  initializer?: string;

  /**
   * The name of the loader function for the extension.
   *
   * This is the name of a function in the [[main]] module which acts
   * as the loader for the extension. It is called whenever a matching
   * extension point is loaded. It takes no arguments and returns a
   * `Promise<T>` where `T` is the type of the extension object.
   *
   * The loader function will never be invoked before the promise
   * returned by the [[initializer]] function (if given) is resolved.
   */
  loader?: string;

  /**
   * The path to the JSON data file for the extension.
   *
   * Some extension points can make use of data defined as JSON. This
   * path will be used to load and parse the JSON into an object and
   * provide the result to the extension point.
   */
  data?: string;

  /**
   * Extra static configuration data for the extension.
   *
   * Some extension points can make use of extra static declarative
   * data associated with an extension. That data can be specified
   * here in the form of an already-parsed JSON object and will be
   * provided to the extension point.
   *
   * Configuration data should be treated as immutable.
   */
  config?: any;
}


/**
 * An object which represents a contribution to an extension point.
 *
 * Objects of this type will be passed to the `receiver` function of an
 * extension point when a matching extension is registered and loaded.
 *
 * All properties of the extension should be treated as read-only.
 */
export
interface IExtension<T> {
  /**
   * The globally unique id of the extension.
   *
   * This is the same `id` declared in the extension specification.
   */
  id: string;

  /**
   * The actual extension object consumed by the extension point.
   *
   * This is the result of resolving the promise returned by the
   * `loader` function declared in the extension specification.
   *
   * This will be `null` if the extension does not specify a loader.
   */
  object: T;

  /**
   * The loaded JSON data specified by the extension.
   *
   * This is the result of calling `JSON.parse` on the contents of the
   * `data` file declared in the extension specification.
   *
   * This will be `null` if the extension does not specify a data file.
   */
  data: any;

  /**
   * The static configuration data specified by the extension.
   *
   * This will be `null` if the extension does not specify such data.
   *
   * Configuration data should be treated as immutable.
   */
  config: any;
}


/**
 * Load an extension point, connecting any existing matching extensions.
 */
export
function loadExtensionPoint(config: IExtensionPointJSON): Promise<IDisposable> {
  if (allExtensionPoints.get(config.id)) {
    throw new Error(`Extension point already exists for {config.id}`)
  }
  var point = new ExtensionPoint(config);
  allExtensionPoints.set(config.id, point);
  var extensions = allExtensions.get(config.id);
  if (!extensions) {
    return Promise.resolve(point);
  }
  allExtensions.delete(config.id);
  var promises: Promise<void>[] = [];
  extensions.map(ext => {
    promises.push(point.connect(ext));
  });
  return Promise.all(promises).then(() => { return point; });
}


/**
 * Load an extension, connecting to the corresponding extension point exists.
 */
export
function loadExtension(config: IExtensionJSON): Promise<IDisposable> {
  var extension = new Extension(config);
  var point = allExtensionPoints.get(config.point);
  if (point) {
    return point.connect(extension).then(() => { return extension; });
  }
  var extensions = allExtensions.get(config.point) || [];
  extensions.push(extension);
  allExtensions.set(config.point, extensions);
  return Promise.resolve(extension);
}


/**
 * Implementation of an Extension Point.
 */
class ExtensionPoint implements IDisposable {

  /**
   * Construct a new extension point.
   */
  constructor(options: IExtensionPointJSON) {
    this._id = options.id;
    this._receiver = options.receiver;
    this._module = options.module;
    this._initializer = options.initializer;
    this._disposables = new DisposableSet();
  }

  /**
   * Whether the extension point has been disposed.
   */
  get isDisposed(): boolean {
    return this._disposables.isDisposed;
  }

  /**
   * Dispose of the resources held by the extension point.
   */
  dispose() {
    allExtensionPoints.delete(this._id);
    this._receiverFunc = null;
    this._disposables.dispose();
  }

  /**
   * Connect an extension to the extension point.
   */
  connect(extension: Extension): Promise<void> {
    if (!this._initialized) {
      return this._load().then(() => this._connectExtension(extension));
    } else {
      return this._connectExtension(extension);
    }
  }

  /**
   * Load the extension point.
   */
  private _load(): Promise<void> {
    return System.import(this._module).then(mod => {
      this._receiverFunc = mod[this._receiver].bind(this);
      return this._initialize();
    });
  }

  /**
   * Initialize the extension point.
   */
  private _initialize(): Promise<void> {
    if ((this._initialized) || (!this._initializer)) {
      this._initialized = true;
      return Promise.resolve(void 0);
    }
    this._initialized = true;
    return System.import(this._module).then(mod => {
      return mod[this._initializer]().then((result: IDisposable) => {
        if (result && result.hasOwnProperty('dispose')) {
          this._disposables.add(result);
        }
      });
    });
  }

  /**
   * Finish connecting and extension to the extension point.
   */
  private _connectExtension(extension: Extension): Promise<void> {
    var receiver = this._receiverFunc;
    return extension.load().then((result: IExtension<any>) => {
      var disposable = receiver(result);
      if (disposable.hasOwnProperty('dispose')) {
         this._disposables.add(disposable);
      }
      return extension.initialize();
    });
  }

  private _id = '';
  private _receiver = '';
  private _module = '';
  private _initializer = '';
  private _initialized = false;
  private _receiverFunc: (extension: IExtension<any>) => IDisposable = null;
  private _disposables: DisposableSet = null;
}


/**
 * Implementation of an Extension.
 */
class Extension implements IDisposable {

  /**
   * Construct a new Extension.
   */
  constructor(options: IExtensionJSON) {
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
    this._disposables = new DisposableSet();
  }

  /**
   * Whether the extension has been disposed.
   */
  get isDisposed(): boolean {
    return this._disposables.isDisposed;
  }

  /**
   * Dispose of the resources held by the extension.
   */
  dispose() {
    this._extension = null;
    this._disposables.dispose();
  }

  /**
   * Initialize the the extension.
   */
  initialize(): Promise<void> {
    this._extension = null;
    if (this._initializer) {
      return System.import(this._module).then(mod => {
        var initializer = mod[this._initializer];
        return initializer().then((disposable: IDisposable) => {
          if (disposable.hasOwnProperty('dispose')) {
            this._disposables.add(disposable);
          }
        });
      });
    } else {
      return Promise.resolve(void 0);
    }
  }

  /**
   * Load the extension.
   */
  load(): Promise<IExtension<any>> {
    return Promise.all([this._loadData(), this._loadObject()])
      .then(() => { return this._extension; });
  }

  /**
   * Load the data for the extension.
   */
  private _loadData(): Promise<void> {
    if (!this._data) {
      return Promise.resolve(void 0);
    }
    return System.import(this._data).then(data => {
      this._extension.data = data;
    });
  }

  /**
   * Load the object for the extension.
   */
  private _loadObject(): Promise<void> {
    if (!this._loader) {
      return Promise.resolve(void 0);
    }
    return System.import(this._module).then(mod => {
      var loader = mod[this._loader] as (() => Promise<any>);
      return loader().then((result: any) => {
        this._extension.object = result;
      });
    });
  }

  private _point = '';
  private _loader = '';
  private _module = '';
  private _data = '';
  private _initializer = '';
  private _extension: IExtension<any> = null;
  private _disposables: DisposableSet = null;
}


// Map of available extension points by point id.
var allExtensionPoints = new Map<string, ExtensionPoint>();


// Map of available extensions by point id.
var allExtensions = new Map<string, Extension[]>();
