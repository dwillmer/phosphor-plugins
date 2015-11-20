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
 * An object which represents a contribution to an extension point.
 *
 * #### Notes
 * All properties of an extension are treated as read-only.
 */
export
interface IExtension extends IDisposable {
  /**
   * The globally unique identifier of the extension.
   */
  id: string;

  /**
   * The identifier of the target extension point.
   */
  point: string;

  /**
   * The behavioral object for the extension, or `null`.
   */
  item: any;

  /**
   * The parsed JSON data for the extension, or `null`.
   */
  data: any;

  /**
   * The static configuration data for the extension, or `null`.
   */
  config: any;
}


/**
 * An object which represents an extension point in an application.
 *
 * #### Notes
 * All properties of an extension point are treated as read-only.
 */
export
interface IExtensionPoint extends IDisposable {
  /**
   * The globally unique id of the extension point.
   */
  id: string;

  /**
   * Add an extension to the extension point.
   *
   * @param extension - The extension to add to the point.
   *
   * #### Notes
   * This should be a no-op if the extension has already been added.
   */
  add(extension: IExtension): void;

  /**
   * Remove an extension from the extension point.
   *
   * @param id - The id of the extension to remove.
   *
   * #### Notes
   * This should be a no-op if the extension has not been added.
   */
  remove(id: string): void;
}


/**
 * List the names of the currently loaded plugins.
 *
 * @returns A new array of the currently loaded plugins.
 */
export
function listPlugins(): string[] {
  return Object.keys(pluginRegistry);
}


/**
 * List the ids of the currently registered extensions.
 *
 * @returns A new array of the current extension ids.
 */
export
function listExtensions(): string[] {
  return Object.keys(extensionRegistry);
}


/**
 * List the ids of the currently registered extension points.
 *
 * @returns A new array of the current extension point ids.
 */
export
function listExtensionPoints(): string[] {
  return Object.keys(pointRegistry);
}


/**
 *
 */
export
function loadPlugin(name: string): void {

}


/**
 *
 */
export
function unloadPlugin(name: string): void {

}


/**
 * Register an extension and connect it to a matching extension point.
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
 * as part of loading the plugin to which they belong.
 */
export
function registerExtension(extension: IExtension): IDisposable {
  return null;
}


/**
 * Register an extension point and connect its matching extensions.
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
 * automatically as part of loading the plugin to which they belong.
 */
export
function registerExtensionPoint(point: IExtensionPoint): IDisposable {
  return null;
}


//-----------------------------------------------------------------------------
// Common Functionality
//-----------------------------------------------------------------------------

/**
 * An enum which defines the possible record states.
 */
const enum RecordState {
  /**
   * The record has not yet been loaded.
   */
  Unloaded,

  /**
   * The record is currently loading.
   */
  Loading,

  /**
   * The record is fully loaded.
   */
  Loaded,

  /**
   * The record is disposed.
   */
  Disposed,
}


/**
 * A type alias for a string map.
 */
type StringMap<T> = { [id: string]: T };


/**
 * Create a new empty string map.
 */
function createMap<T>(): StringMap<T> {
  return Object.create(null);
}


/**
 * Safely dispose of something which may be a disposable.
 *
 * Errors will be caught and logged to the console.
 */
function safeDispose(item: any): void {
  if (item && typeof item.dispose === 'function') {
    try {
      item.dispose();
    } catch (err) {
      console.error(err);
    }
  }
}


/**
 * Safely dispose of maybe-disposables in a map.
 *
 * Errors will be caught and logged to the console.
 */
function safeDisposeMap(map: StringMap<any>): void {
  for (let key in map) safeDispose(map[key]);
}


//-----------------------------------------------------------------------------
// Extension Implementation
//-----------------------------------------------------------------------------

/**
 * A concrete implementation of `IExtension`.
 */
class Extension implements IExtension {
  /**
   * Create a new extension from a spec, item, and data.
   *
   * @param spec - The specification for the extension.
   *
   * @param item - The behavioral object for the extension, or `null`.
   *
   * @param data - The parsed JSON data for the extension, or `null`.
   *
   * @returns A new extension instance.
   */
  static create(spec: IExtensionSpec, item: any, data: any): Extension {
    return new Extension(spec.id, spec.point, item, data, spec.config);
  }

  /**
   * Construct a new extension.
   *
   * @param id - The globally unique identifier of the extension.
   *
   * @param point - The identifier of the target extension point.
   *
   * @param item - The behavioral object for the extension, or `null`.
   *
   * @param data - The parsed JSON data for the extension, or `null`.
   *
   * @param config - The static configuration data, or `null`.
   */
  constructor(id: string, point: string, item: any, data: any, config: any) {
    this._id = id;
    this._point = point;
    this._item = item || null;
    this._data = data || null;
    this._config = config || null;
  }

  /**
   * Dispose of the resources held by the extension.
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    let item = this._item;
    this._item = null;
    this._data = null;
    this._config = null;
    safeDispose(item);
  }

  /**
   * Test whether the extension has been disposed.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * The globally unique identifier of the extension.
   */
  get id(): string {
    return this._id;
  }

  /**
   * The identifier of the target extension point.
   */
  get point(): string {
    return this._point;
  }

  /**
   * The behavioral object for the extension, or `null`.
   */
  get item(): any {
    return this._item;
  }

  /**
   * The parsed JSON data for the extension, or `null`.
   */
  get data(): any {
    return this._data;
  }

  /**
   * The static configuration data for the extension, or `null`.
   */
  get config(): any {
    return this._config;
  }

  private _id: string;
  private _point: string;
  private _item: any;
  private _data: any;
  private _config: any;
  private _disposed = false;
}


/**
 * An object which provides the specification for an extension.
 */
interface IExtensionSpec {
  /**
   * The globally unique id of the extension.
   */
  id: string;

  /**
   * The identifier of the target extension point.
   */
  point: string;

  /**
   * The path to the main module for the extension.
   */
  main?: string;

  /**
   * The name of the initializer function for the extension.
   */
  initializer?: string;

  /**
   * The name of the loader function for the extension.
   */
  loader?: string;

  /**
   * The path to the JSON data file for the extension.
   */
  data?: string;

  /**
   * Extra static configuration data for the extension.
   */
  config?: any;
}


/**
 * A registration record for an extension.
 */
interface IExtensionRecord {
  /**
   * The life cycle state of the record.
   */
  state: RecordState;

  /**
   * The specification of the extension.
   *
   * This will be `null` for manually registered extensions.
   */
  spec: IExtensionSpec;

  /**
   * The actual extension object.
   *
   * This will be `null` until the record is fully loaded.
   */
  value: IExtension;

  /**
   * A maybe-disposable to invoke after disposing the extension.
   *
   * This will be `null` for manually registered extensions.
   */
  disposable: any;

  /**
   * The loader promise for the record.
   *
   * This will be `null` unless the record is loading.
   */
  promise: Promise<void>;
}


/**
 * A mapping of extension id to extension record.
 */
var extensionRegistry = createMap<IExtensionRecord>();


/**
 * Ensure an extension record is fully loaded.
 *
 * If the record `state` is `Unloaded`, the `spec` must not be `null`.
 *
 * It is possible for the the record to be disposed before the loader
 * promise is resolved, so the caller must validate the record state
 * after resolving the returned promise.
 */
function loadExtension(record: IExtensionRecord): Promise<void> {
  // If the record is disposed, there is nothing to do.
  if (record.state === RecordState.Disposed) {
    return Promise.resolve<void>();
  }

  // If the record is fully loaded, there is nothing to do.
  if (record.state === RecordState.Loaded) {
    return Promise.resolve<void>();
  }

  // If the record is still loading, return the pending promise.
  if (record.state === RecordState.Loading) {
    return record.promise;
  }

  // Setup local variables for loading the extension.
  let spec = record.spec;
  let data: any = null;
  let main: any = null;

  // Kick off the promise loading chain.
  let promise = Promise.resolve().then(() => {

    // Load the extension JSON data, if given.
    return spec.data ? System.import(spec.data) : null;

  }).then(argdata => {

    // Store the loaded JSON data for future use in the chain.
    data = argdata;

    // Load the main extension module, if given.
    return spec.main ? System.import(spec.main) : null;

  }).then(argmain => {

    // Store the loaded main module for future use in the chain.
    main = argmain;

    // If there is no initializer function, skip to the next step.
    if (!main || !spec.initializer) {
      return null;
    }

    // Throw an error if the initializer is not a function.
    let initializer = main[spec.initializer];
    if (typeof initializer !== 'function') {
      throw new Error(`Extension '${spec.id}' has invalid initializer.`);
    }

    // Load the result of the initializer.
    return initializer();

  }).then(disposable => {

    // Update the main disposable for the record.
    record.disposable = disposable;

    // If there is no loader function, skip to the next step.
    if (!main || !spec.loader) {
      return null;
    }

    // Throw an error if the loader is not a function.
    let loader = main[spec.loader];
    if (typeof loader !== 'function') {
      throw new Error(`Extension '${spec.id}' has invalid loader.`);
    }

    // Load the actual item for the extension.
    return loader();

  }).then(item => {

    // If the record was disposed before reaching this point, release
    // the item and disposable. Otherwise, create the extension object
    // and update the record state.
    if (record.state === RecordState.Disposed) {
      safeDispose(item);
      safeDispose(record.disposable);
    } else {
      record.value = Extension.create(spec, item, data);
      record.state = RecordState.Loaded;
    }

  }).catch(err => {

    // Log any errors which occur and then dispose the record.
    console.error(err);
    record.state = RecordState.Disposed;
    delete extensionRegistry[spec.id];
    safeDispose(record.disposable);

  }).then(() => {

    // Finally, clear the promise and local variable state.
    record.promise = null;
    data = null;
    main = null;

  });

  // Update the record loading state.
  record.promise = promise;
  record.state = RecordState.Loading;

  // Return the new loader promise.
  return promise;
}


//-----------------------------------------------------------------------------
// Extension Point Implementation
//-----------------------------------------------------------------------------

/**
 * A type alias for an extension point receiver function.
 */
type Receiver = (extension: IExtension) => any;


/**
 * A concrete implementation of `IExtensionPoint`.
 */
class ExtensionPoint implements IExtensionPoint {
  /**
   * Create a new extension point from a spec and receiver.
   *
   * @param spec - The specification for the extension point.
   *
   * @param receiver - The extension point receiver function.
   */
  static create(spec: IPointSpec, receiver: Receiver): ExtensionPoint {
    return new ExtensionPoint(spec.id, receiver);
  }

  /**
   * Construct a new extension point.
   *
   * @param id - The globally unique id of the extension point.
   *
   * @param receiver - The extension point receiver function.
   */
  constructor(id: string, receiver: Receiver) {
    this._id = id;
    this._receiver = receiver;
  }

  /**
   * Dispose of the resources held by the extension point.
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    let map = this._map;
    this._map = null;
    this._receiver = null;
    safeDisposeMap(map);
  }

  /**
   * Test whether the extension point has been disposed.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * The globally unique id of the extension point.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Add an extension to the extension point.
   *
   * @param extension - The extension to add to the point.
   *
   * #### Notes
   * This is a no-op if the extension has already been added.
   */
  add(extension: IExtension): void {
    if (this._disposed) {
      throw new Error(`Extension point ${this._id} is disposed.`);
    }
    if (extension.id in this._map) {
      return;
    }
    this._map[extension.id] = this._receiver.call(void 0, extension);
  }

  /**
   * Remove an extension from the extension point.
   *
   * @param id - The id of the extension to remove.
   *
   * #### Notes
   * This is a no-op if the extension has not been added.
   */
  remove(id: string): void {
    if (this._disposed) {
      throw new Error(`Extension point ${this._id} is disposed.`);
    }
    if (!(id in this._map)) {
      return;
    }
    let item = this._map[id];
    delete this._map[id];
    safeDispose(item);
  }

  private _id: string;
  private _receiver: Receiver;
  private _map = createMap<any>();
  private _disposed = false;
}


/**
 * An object which provides the specification for an extension point.
 */
interface IPointSpec {
  /**
   * The globally unique id of the extension point.
   */
  id: string;

  /**
   * The path to the main module for the extension point.
   */
  main: string;

  /**
   * The name of the receiver function for the extension point.
   */
  receiver: string;

  /**
   * The name of the initializer function for the extension point.
   */
  initializer?: string;
}


/**
 * A registration record for an extension point.
 */
interface IPointRecord {
  /**
   * The life cycle state of the record.
   */
  state: RecordState;

  /**
   * The specification of the extension point.
   *
   * This will be `null` for manually registered extension points.
   */
  spec: IPointSpec;

  /**
   * The extension point object.
   *
   * This will be `null` until the record is fully loaded.
   */
  value: IExtensionPoint;

  /**
   * A maybe-disposable to invoke after disposing the extension point.
   *
   * This will be `null` for manually registered extension points.
   */
  disposable: any;

  /**
   * The loader promise for the record.
   *
   * This will be `null` unless the record is loading.
   */
  promise: Promise<void>;
}


/**
 * A mapping of extension point id to extension point record.
 */
var pointRegistry = createMap<IPointRecord>();


/**
 * Ensure an extension point record is fully loaded.
 *
 * If the record `state` is `Unloaded`, the `spec` must not be `null`.
 *
 * It is possible for the the record to be disposed before the loader
 * promise is resolved, so the caller must validate the record state
 * after resolving the returned promise.
 */
function loadPoint(record: IPointRecord): Promise<void> {
  // If the record is disposed, there is nothing to do.
  if (record.state === RecordState.Disposed) {
    return Promise.resolve<void>();
  }

  // If the record is fully loaded, there is nothing to do.
  if (record.state === RecordState.Loaded) {
    return Promise.resolve<void>();
  }

  // If the record is still loading, return the pending promise.
  if (record.state === RecordState.Loading) {
    return record.promise;
  }

  // Setup local variables for loading the extension point.
  let spec = record.spec;
  let main: any = null;

  // Kick off the promise loading chain.
  let promise = Promise.resolve().then(() => {

    // Load the main extension point module.
    return System.import(spec.main);

  }).then(argmain => {

    // Store the loaded main module for future use in the chain.
    main = argmain;

    // If there is no initializer function, skip to the next step.
    if (!spec.initializer) {
      return null;
    }

    // Throw an error if the initializer is not a function.
    let initializer = main[spec.initializer];
    if (typeof initializer !== 'function') {
      throw new Error(`Extension '${spec.id}' has invalid initializer.`);
    }

    // Load the result of the initializer.
    return initializer();

  }).then(disposable => {

    // Update the main disposable for the record.
    record.disposable = disposable;

    // Throw an error if the receiver is not a function.
    let receiver = main[spec.receiver];
    if (typeof receiver !== 'function') {
      throw new Error(`Extension point '${spec.id}' has invalid receiver.`);
    }

    // Return the receiver function.
    return receiver;

  }).then(receiver => {

    // If the record was disposed before reaching this point, release
    // the disposable. Otherwise, create the extension point object
    // and update the record state.
    if (record.state === RecordState.Disposed) {
      safeDispose(record.disposable);
    } else {
      record.value = ExtensionPoint.create(spec, receiver);
      record.state = RecordState.Loaded;
    }

  }).catch(err => {

    // Log any errors which occur and then dispose the record.
    console.error(err);
    record.state = RecordState.Disposed;
    delete pointRegistry[spec.id];
    safeDispose(record.disposable);

  }).then(() => {

    // Finally, clear the promise and local variable state.
    record.promise = null;
    main = null;

  });

  // Update the record loading state.
  record.promise = promise;
  record.state = RecordState.Loading;

  // Return the new loader promise.
  return promise;
}


//-----------------------------------------------------------------------------
// Extension Point Matching
//-----------------------------------------------------------------------------

//-----------------------------------------------------------------------------
// Plugin Implementation
//-----------------------------------------------------------------------------

/**
 * A mapping of plugin name to plugin spec.
 */
var pluginRegistry = createMap<any>();
