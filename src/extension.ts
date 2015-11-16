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
   * When the extension is loaded, this module will be imported with
   * `System.import`.
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
   * The [[loader]] will not be invoked until the promise returned by
   * the initializer resolves. This allows the extension to perform
   * asynchronous setup before loading the actual extension object.
   *
   * An initializer does not need to be provided if the extension does
   * not require extra initialization.
   */
  initializer?: string;

  /**
   * The name of the loader function for the extension.
   *
   * This is the name of a function in the [[main]] module which acts
   * as the object loader for the extension. It takes no arguments and
   * should return an object or a `Promise` to an object of the type
   * required by the target extension point.
   *
   * The loader function will not be called before the promise returned
   * by the [[initializer]] function is resolved.
   *
   * A loader does not need to be provided if the extension does not
   * provide a runtime behavioral object.
   */
  loader?: string;

  /**
   * The path to the JSON data file for the extension.
   *
   * Some extension points can make use of data defined as JSON. This
   * path will be used to load and parse the JSON into an object and
   * provide the result to the extension point.
   *
   * If provided, the contents of this file must be valid JSON.
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
   * If provided, the config data should be treated as immutable.
   */
  config?: {};
}


/**
 * An object which represents a contribution to an extension point.
 *
 * Objects of this type are passed to the `receiver` function of a
 * matching extension point when both are registered and loaded.
 */
export
class Extension implements IDisposable {
  /**
   * Construct a new extension.
   *
   * @param id - The globally unique identifier of the extension.
   *
   * @param item - The resolved return value of the extension `loader`
   *   function. This may be `null`.
   *
   * @param data - The loaded and parsed JSON extension data. This may
   *   be `null`.
   *
   * @param config - The static configuration data. This may be `null`.
   *
   * @param disposable - A disposable to invoke when the extension is
   *   disposed. This may be `null`.
   */
  constructor(id: string, item: {}, data: {}, config: {}, disposable: {}) {
    this._id = id;
    this._item = item || null;
    this._data = data || null;
    this._config = config || null;
    this._disposable = disposable || null;
  }

  /**
   * Dispose of the resources held by the extension.
   *
   * #### Notes
   * All calls made after the first call to this method are a no-op.
   *
   * It is generally unsafe to use the extension after it is disposed.
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    this._item = null;
    this._data = null;
    this._config = null;
    safeDispose(this._disposable);
    this._disposable = null;
  }

  /**
   * Test whether the extension has been disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Get the globally unique id of the extension.
   *
   * #### Notes
   * This is a read-only property.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get the behavioral object for the extension.
   *
   * #### Notes
   * This may be `null`.
   *
   * This is a read-only property.
   */
  get item(): {} {
    return this._item;
  }

  /**
   * Get the parsed JSON data for the extension.
   *
   * #### Notes
   * This may be `null`.
   *
   * This is a read-only property.
   */
  get data(): {} {
    return this._data;
  }

  /**
   * Get the static configuration data for the extension.
   *
   * #### Notes
   * This may be `null`.
   *
   * This is a read-only property.
   */
  get config(): {} {
    return this._config;
  }

  private _id: string;
  private _item: {};
  private _data: {};
  private _config: {};
  private _disposable: {};
  private _disposed = false;
}


/**
 * Load an extension for the given extension spec.
 *
 * @param spec - The specification for the extension.
 *
 * @returns A promise which resolves to a new extension object, or
 *   reject if the extension fails to load or is otherwise invalid.
 */
export
function loadExtension(spec: IExtensionSpec): Promise<Extension> {
  let exdata: {};
  let exdisp: {};
  let exmain: any;
  return loadData(spec).then(data => {
    exdata = data;
    return loadMain(spec);
  }).then(main => {
    exmain = main;
    return initMain(spec, main);
  }).then(disp => {
    exdisp = disp;
    return loadItem(spec, exmain);
  }).then(item => {
    return new Extension(spec.id, item, exdata, spec.config, exdisp);
  });
}


/**
 * Load the JSON data for an extension spec.
 *
 * @param spec - The specification for the extension.
 *
 * @returns A promise which resolves to the loaded data, or `null`
 *   if no data is specified. It rejects if the data fails to load.
 */
function loadData(spec: IExtensionSpec): Promise<{}> {
  if (spec.data) {
    return System.import(spec.data + '!system-json');
  }
  return Promise.resolve(null);
}


/**
 * Load the main module for an extension spec.
 *
 * @param spec - The specification for the extension.
 *
 * @returns A promise which resolves to the loaded module, or `null`
 *   if no main is specified. It rejects if the module fails to load.
 */
function loadMain(spec: IExtensionSpec): Promise<any> {
  if (spec.main) {
    return System.import(spec.main);
  }
  return Promise.resolve(null);
}


/**
 * Initialize the main module for an extension spec.
 *
 * @param spec - The specification for the extension.
 *
 * @returns A promise which resolves to the result of the initializer,
 *   or `null` if no initializer is specified.
 *
 * @throws An error if the initializer is invalid or throws.
 */
function initMain(spec: IExtensionSpec, main: any): Promise<{}> {
  if (!main || !spec.initializer) {
    return Promise.resolve(null);
  }
  let initializer = main[spec.initializer];
  if (typeof initializer !== 'function') {
    throw new Error(`Extension '${spec.id}' has invalid initializer.`);
  }
  return Promise.resolve(initializer());
}


/**
 * Load the behavioral item for an extension spec.
 *
 * @param spec - The specification for the extension.
 *
 * @returns A promise which resolves to the result of the loader,
 *   or `null` if no loader is specified.
 *
 * @throws An error if the loader is invalid or throws.
 */
function loadItem(spec: IExtensionSpec, main: any): Promise<{}> {
  if (!main || !spec.loader) {
    return Promise.resolve(null);
  }
  let loader = main[spec.loader];
  if (typeof loader !== 'function') {
    throw new Error(`Extension '${spec.id}' has invalid loader.`);
  }
  return Promise.resolve(loader());
}


/**
 * Safely dispose something which may or may not be a disposable.
 *
 * This will invoke the `dispose` method of the object if present.
 *
 * This function is null-safe.
 */
function safeDispose(obj: any): void {
  if (obj && typeof obj.dispose === 'function') obj.dispose();
}
