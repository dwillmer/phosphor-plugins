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

import {
  IExtension
} from './extension';


/**
 * An object which provides the specification for an extension point.
 *
 * The extension point spec contains the information necessary for the
 * plugin system to lazily load and initialize the extension point when
 * matching extensions are registered.
 *
 * User code will not typically create a spec directly. Instead, the
 * plugin system will create a spec from the `phosphor-plugin.json`.
 */
export
interface IExtensionPointSpec {
  /**
   * The globally unique id of the extension point.
   *
   * Uniqueness of the id is enforced when the spec is registered. To
   * minimize the possibility of conflicts and remain human-readable,
   * the id should use the format: `my-plugin:my-extension-point`.
   */
  id: string;

  /**
   * The path to the main module for the extension point.
   *
   * When the extension point is loaded, this module will be imported
   * with `System.import`. This means that any module format can be
   * used, provided the system importer is properly configured.
   */
  main: string;

  /**
   * The name of the initializer function for the extension point.
   *
   * This is the name of a function in the [[main]] module which acts
   * as the initializer for the extension point. It takes no arguments
   * and should return `null`, `IDisposable`, or `Promise<IDisposable>`.
   * The disposable will be called when the extension point is unloaded.
   *
   * The [[receiver]] will not be invoked until the promise returned
   * by the initializer resolves. This allows the extension point to
   * perform asynchronous setup after its module is loaded, but before
   * receiving extensions.
   *
   * This may be an empty string if there is no initializer.
   */
  initializer: string;

  /**
   * The name of the receiver function for the extension point.
   *
   * This is the name of a function in the [[main]] module which acts
   * as the receiver for the extension point. It takes an argument of
   * type `Extension` and returns an `IDisposable`. The disposable
   * will be called when the extension is unloaded.
   *
   * The receiver function will not be called before the promise
   * returned by the [[initializer]] function is resolved.
   */
  receiver: string;
}


/**
 * An object which represents an extensible point in an application.
 */
export
interface IExtensionPoint extends IDisposable {
  /**
   * The globally unique id of the extension point.
   *
   * #### Notes
   * This is a read-only property.
   */
  id: string;

  /**
   * Add an extension to the extension point.
   *
   * @param extension - The extension to add to the point.
   *
   * @throws An error if the extension has a non-matching point id,
   *   or if the extension point is disposed.
   *
   * #### Notes
   * This is a no-op if the extension has already been added.
   */
  add(extension: IExtension): void;

  /**
   * Remove an extension from the extension point.
   *
   * @param id - The id of the extension point.
   *
   * @throws An error if the extension extension point is disposed.
   *
   * #### Notes
   * This is a no-op if no matching extension has been added.
   *
   * An extension should be removed **before** it is disposed.
   */
  remove(id: string): void;
}


/**
 * Load an extension point for the given extension point spec.
 *
 * @param spec - The specification for the extension point.
 *
 * @returns A promise which resolves to a new extension point, or
 *   rejects if the point fails to load or is otherwise invalid.
 */
export
function loadExtensionPoint(spec: IExtensionPointSpec): Promise<IExtensionPoint> {
  let exmain: any;
  return loadMain(spec).then(main => {
    exmain = main;
    return initMain(spec, main);
  }).then(disp => {
    let receiver = lookupReceiver(spec, exmain);
    return new ExtensionPoint(spec, receiver, disp);
  });
}


/**
 * Load the main module for an extension point spec.
 *
 * @param spec - The specification for the extension point.
 *
 * @returns A promise which resolves to the loaded module, or rejects
 *   if the module fails to load.
 */
function loadMain(spec: IExtensionPointSpec): Promise<any> {
  return System.import(spec.main);
}


/**
 * Initialize the main module for an extension point spec.
 *
 * @param spec - The specification for the extension point.
 *
 * @param main - The main extension point module.
 *
 * @returns A promise which resolves to the result of the initializer,
 *   or `null` if no initializer is specified.
 *
 * @throws An error if the initializer is invalid or throws.
 */
function initMain(spec: IExtensionPointSpec, main: any): Promise<{}> {
  if (!spec.initializer) {
    return Promise.resolve(null);
  }
  let initializer = main[spec.initializer];
  if (typeof initializer !== 'function') {
    throw new Error(`Extension point '${spec.id}' has invalid initializer.`);
  }
  return Promise.resolve(initializer());
}


/**
 * Lookup the receiver function for an extension point.
 *
 * @param spec - The specification for the extension point.
 *
 * @param main - The main extension point module.
 *
 * @returns The extension point receiver function.
 *
 * @throws An error if the receiver is invalid.
 */
function lookupReceiver(spec: IExtensionPointSpec, main: any): Receiver {
  let receiver = main[spec.receiver];
  if (typeof receiver !== 'function') {
    throw new Error(`Extension point '${spec.id}' has invalid receiver.`);
  }
  return receiver;
}


/**
 * A type alias for an extension point receiver function.
 */
type Receiver = (extension: IExtension) => {};


/**
 * A type alias for a string map.
 */
type StringMap<T> = { [key: string]: T };


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


/**
 * Safely dispose of maybe-disposables in a map.
 */
function safeDisposeMap(map: StringMap<{}>): void {
  for (let key in map) safeDispose(map[key]);
}


/**
 * A concrete implementation of `IExtensionPoint`.
 */
class ExtensionPoint implements IExtensionPoint {
  /**
   * Construct a new extension point.
   *
   * @param spec - The extension point specification.
   *
   * @param receiver - The extension point receiver function.
   *
   * @param disposable - A disposable to invoke on extension point
   *   dispose. This may be `null`.
   */
  constructor(spec: IExtensionPointSpec, receiver: Receiver, disposable: {}) {
    this._spec = spec;
    this._receiver = receiver;
    this._disposable = disposable;
  }

  /**
   * Dispose of the resources held by the extension point.
   *
   * #### Notes
   * All calls made after the first call to this method are a no-op.
   *
   * It is generally unsafe to use the point after it is disposed.
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    let map = this._map;
    let disposable = this._disposable;
    this._map = null;
    this._receiver = null;
    this._disposable = null;
    safeDisposeMap(map);
    safeDispose(disposable);
  }

  /**
   * Test whether the extension point has been disposed.
   *
   * #### Notes
   * This is a read-only property.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * The globally unique id of the extension point.
   *
   * #### Notes
   * This is a read-only property.
   */
  get id(): string {
    return this._spec.id;
  }

  /**
   * Add an extension to the extension point.
   *
   * @param extension - The extension to add to the point.
   *
   * @throws An error if the extension has a non-matching point id,
   *   or if the extension point is disposed.
   *
   * #### Notes
   * This is a no-op if the extension has already been added.
   */
  add(extension: IExtension): void {
    if (this._disposed) {
      throw new Error('Extension point is disposed.');
    }
    if (this.id !== extension.point) {
      let idA = this.id;
      let idB = extension.point;
      throw new Error(`Extension point mismatch: '${idA}' != '${idB}'`);
    }
    if (extension.id in this._map) {
      return;
    }
    this._map[extension.id] = this._receiver.call(void 0, extension);
  }

  /**
   * Remove an extension from the extension point.
   *
   * @param id - The id of the extension point.
   *
   * @throws An error if the extension extension point is disposed.
   *
   * #### Notes
   * This is a no-op if no matching extension has been added.
   *
   * An extension should be removed **before** it is disposed.
   */
  remove(id: string): void {
    if (this._disposed) {
      throw new Error('Extension point is disposed.');
    }
    if (!(id in this._map)) {
      return;
    }
    let obj = this._map[id];
    delete this._map[id];
    safeDispose(obj);
  }

  private _disposable: {};
  private _disposed = false;
  private _receiver: Receiver;
  private _spec: IExtensionPointSpec;
  private _map: StringMap<{}> = Object.create(null);
}
