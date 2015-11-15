/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  IDisposable
} from 'phosphor-disposable';


/**
 * An object which provides the specification for an extension.
 *
 * The extension spec contains the information necessary for the plugin
 * system to lazily load and initialize the extension when the matching
 * extension point is registered.
 *
 * User code will not typically create an extension spec directly. The
 * plugin system will create a spec automatically using the definition
 * contained in the plugin's `package.json`.
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
   * before the extension. The extension will be loaded as soon as a
   * matching extension point is registered.
   */
  point: string;

  /**
   * The path to the main module for the extension.
   *
   * When a matching extension point is registered, this module will
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
   * as the initializer for the extension. It takes no arguments and
   * should return `null`, `IDisposable`, or `Promise<IDisposable>`.
   * The disposable will be disposed when the extension is unloaded.
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
   * extension point is loaded. It takes no arguments and should return
   * an object of the type required by the target extension point, or a
   * `Promise` to such an object.
   *
   * The loader function will not be called before the promise returned
   * by the [[initializer]] function is resolved.
   */
  loader?: string;

  /**
   * The path to the JSON data file for the extension.
   *
   * Some extension points can make use of data defined as JSON. This
   * path will be used to load and parse the JSON into an object and
   * provide the result to the extension point.
   *
   * The contents of this file must be valid JSON.
   */
  data?: string;

  /**
   * Extra static configuration data for the extension.
   *
   * Some extension points can make use of extra static declarative
   * data associated with an extension. That data can be specified
   * here in the form of an already-parsed JSON object and will be
   * provided directly to the extension point.
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
 */
export
interface IExtension<T> {
  /**
   * The globally unique id of the extension.
   *
   * This is the same `id` declared in the extension specification.
   *
   * This is a read-only property.
   */
  id: string;

  /**
   * The actual extension object consumed by the extension point.
   *
   * This is the result of resolving the promise returned by the
   * `loader` function declared in the extension specification.
   *
   * This will be `null` if the extension does not specify a loader.
   *
   * This is a read-only property.
   */
  item: T;

  /**
   * The loaded JSON data specified by the extension.
   *
   * This is the result of calling `JSON.parse` on the contents of the
   * `data` file declared in the extension specification.
   *
   * This will be `null` if the extension does not specify a data file.
   *
   * This is a read-only property.
   */
  data: any;

  /**
   * The static configuration data specified by the extension.
   *
   * This will be `null` if the extension does not specify such data.
   *
   * Configuration data should be treated as immutable.
   *
   * This is a read-only property.
   */
  config: any;
}


/**
 * A class which manages the life cycle of an extension.
 *
 * User code will not typically interact with instances of this class
 * directly. The plugin system will create and manipulate extension
 * managers automatically when a plugin registers its extensions.
 */
export
class ExtensionManager implements IDisposable {
  /**
   * Construct a new extension manager.
   *
   * @param spec - The specification for the extension.
   */
  constructor(spec: IExtensionSpec) {
    this._id = spec.id;
    this._point = spec.point;
    this._main = spec.main || '';
    this._data = spec.data || '';
    this._loader = spec.loader || '';
    this._config = spec.config || null;
    this._initializer = spec.initializer || '';
  }

  /**
   * Dispose of the extension.
   *
   * This will release the loaded extension and invoke the disposable
   * returned by the module initializer. After this method returns,
   * the `load` method will always return a rejected promise.
   *
   * All subsequent calls to this method will be a no-op.
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this._promise = Promise.reject(this._disposedError());
    safeDispose(this._disposable);
    this._disposable = null;
  }

  /**
   * Test whether the extension is disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Get the unique id of the extension.
   *
   * #### Notes
   * This is a read-only property.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get the id of the targeted extension point.
   *
   * #### Notes
   * This is a read-only property.
   */
  get point(): string {
    return this._point;
  }

  /**
   * Load the extension object.
   *
   * @returns A promise which resolves to the loaded extension object,
   *   or rejects if the extension object fails to fully load.
   *
   * #### Notes
   * The first time this method is called, the extension module and its
   * associated data will be loaded and initialized. All further calls
   * to this method will return the same resolved promise.
   *
   * After the extension is disposed, the returned promise will reject
   * with an error.
   *
   * The consumer should not hold onto the returned promise. Instead,
   * it should call this method and resolve the returned promise each
   * time the extension is required (which is typically only once).
   */
  load(): Promise<IExtension<any>> {
    return this._promise || (this._promise = this._loadImpl());
  }

  /**
   * Create a promise which loads the actual extension.
   *
   * This is the primary method which assembles the promise chain.
   *
   * If the extension is disposed before the promise resolves, the
   * returned promise will be rejected will an appropriate error.
   */
  private _loadImpl(): Promise<IExtension<any>> {
    let pItem = this._loadItem();
    let pData = this._loadData();
    return Promise.all([pItem, pData]).then(([item, data]) => {
      if (this._disposed) throw this._disposedError();
      return Object.freeze({ id: this._id, item, data, config: this._config });
    });
  }

  /**
   * Create a promise which loads the extension item.
   *
   * This will first load and initialize the main module if given,
   * then invoke the extension loader function if specified.
   *
   * The returned promise will resolve to the extension item or `null`.
   * It will reject if the main module fails to load or initialize, or
   * if the loader function is invalid.
   */
  private _loadItem(): Promise<any> {
    return this._loadMain().then(main => {
      if (this._disposed) {
        throw this._disposedError();
      }
      if (!main || !this._initializer) {
        return [main, null];
      }
      let initializer = main[this._initializer];
      if (typeof initializer !== 'function') {
        throw this._initializerError();
      }
      return Promise.all([main, initializer()]);
    }).then(([main, disposable]) => {
      if (this._disposed) {
        safeDispose(disposable);
        throw this._disposedError();
      }
      this._disposable = disposable;
      return main;
    }).then(main => {
      if (this._disposed) {
        throw this._disposedError();
      }
      if (!main || !this._loader) {
        return null;
      }
      let loader = main[this._loader];
      if (typeof loader !== 'function') {
        throw this._loaderError();
      }
      return Promise.resolve(loader());
    });
  }

  /**
   * Create a promise which loads the extension JSON data.
   *
   * The returned promise will resolve to the JSON data, or null if no
   * data file was specified. It will reject if the data fails to load.
   */
  private _loadData(): Promise<any> {
    if (this._data) {
      return System.import(this._data + '!system-json');
    }
    return Promise.resolve(null);
  }

  /**
   * Create a promise which loads the extension main module.
   *
   * The returned promise will resolve the module, or null if no main
   * module was specified. It will reject if the module fails to load.
   */
  private _loadMain(): Promise<any> {
    if (this._main) {
      return System.import(this._main);
    }
    return Promise.resolve(null);
  }

  /**
   * Create an error indicating the extension is disposed.
   */
  private _disposedError(): Error {
    return new Error(`Extension '${this._id}' is disposed.`);
  }

  /**
   * Create an error indicating the extension initializer is invalid.
   */
  private _initializerError(): Error {
    return new Error(`Extension '${this._id}' has invalid initializer.`);
  }

  /**
   * Create an error indicating the extension loader is invalid.
   */
  private _loaderError(): Error {
    return new Error(`Extension '${this._id}' has invalid loader.`);
  }

  private _id: string;
  private _config: any;
  private _main: string;
  private _data: string;
  private _point: string;
  private _loader: string;
  private _initializer: string;
  private _disposable: any = null;
  private _promise: Promise<IExtension<any>> = null;
  private _disposed = false;
}


/**
 * Dispose of an object which might be a disposable.
 *
 * This will invoke the `dispose` method of an object if it exists.
 * If the object is null or has no such method, this is a no-op.
 */
function safeDispose(obj: any): void {
  if (obj && typeof obj.dispose === 'function') {
    obj.dispose();
  }
}
