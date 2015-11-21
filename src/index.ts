/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  DisposableDelegate, IDisposable
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
 * List the names of the currently registered plugins.
 *
 * @returns A new array of the current plugin names.
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
 * Register a plugin and load its configuration JSON.
 *
 * @param name - The name of the plugin to register.
 *
 * @returns A disposable which will unload the plugin.
 *
 * @throws An error if the plugin name is already registered.
 */
export
function registerPlugin(name: string): IDisposable {
  // Throw an error if the plugin name is registered.
  if (name in pluginRegistry) {
    throw new Error(`Plugin '${name}' is already registered.`);
  }

  // Create a new unloaded record for the plugin.
  let record: IPluginRecord = {
    state: RecordState.Unloaded,
    name: name,
    spec: null,
    promise: null,
  };

  // Add the record to the plugin registry.
  pluginRegistry[name] = record;

  // Load the plugin record.
  loadPlugin(record);

  // Return a disposable which will unload the plugin.
  return new DisposableDelegate(() => { disposePlugin(name); });
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
 * as part of registering their owner plugin.
 */
export
function registerExtension(extension: IExtension): IDisposable {
  // Throw an error if the extension id is registered.
  if (extension.id in extensionRegistry) {
    throw new Error(`Extension '${extension.id}' is already registered.`);
  }

  // Create a compatible spec for the extension.
  let spec: IExtensionSpec = {
    id: extension.id,
    point: extension.point,
    main: '',
    factory: '',
    data: '',
    config: null,
  };

  // Create a new loaded record for the extension.
  let record: IExtensionRecord = {
    state: RecordState.Loaded,
    spec: spec,
    value: extension,
    promise: null,
  };

  // Add the record to the extension registry.
  extensionRegistry[extension.id] = record;

  // Load any matching extension point.
  loadMatchingPoint(record);

  // Return a disposable which will unload the extension.
  return new DisposableDelegate(() => { disposeExtension(spec.id); });
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
 * automatically as part of registering their owner plugin.
 */
export
function registerExtensionPoint(point: IExtensionPoint): IDisposable {
  // Throw an error if the extension point id is registered.
  if (point.id in pointRegistry) {
    throw new Error(`Extension point '${point.id}' is already registered.`);
  }

  // Create a compatible spec for the extension point.
  let spec: IPointSpec = {
    id: point.id,
    main: '',
    factory: '',
  };

  // Create a new loaded record for the extension.
  let record: IPointRecord = {
    state: RecordState.Loaded,
    spec: spec,
    value: point,
    promise: null,
  };

  // Add the record to the registry.
  pointRegistry[point.id] = record;

  // Load any matching extensions.
  loadMatchingExtensions(record);

  // Return a disposable which will unload the extension point.
  return new DisposableDelegate(() => { disposePoint(spec.id); });
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
 * All errors will be caught and logged to the console.
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

//-----------------------------------------------------------------------------
// Plugin Implementation
//-----------------------------------------------------------------------------

/**
 * An object which provides the specification for a plugin.
 */
interface IPluginSpec {
  /**
   * The extension specs for the plugin, or `[]`.
   */
  extensions: IExtensionSpec[];

  /**
   * The extension point specs for the plugin, or `[]`.
   */
  extensionPoints: IPointSpec[];
}


/**
 * A registration record for a plugin.
 */
interface IPluginRecord {
  /**
   * The life cycle state of the record.
   */
  state: RecordState;

  /**
   * The name of the plugin.
   */
  name: string;

  /**
   * The specification of the plugin, or `null` if not yet loaded.
   */
  spec: IPluginSpec;

  /**
   * The loader promise for the record, or `null` if not loading.
   */
  promise: Promise<any>;
}


/**
 * A mapping of plugin name to plugin record.
 */
var pluginRegistry = createMap<IPluginRecord>();


/**
 * Ensure a plugin record is fully loaded.
 */
function loadPlugin(record: IPluginRecord): void {

}


/**
 * Dispose of the plugin with the specified name.
 */
function disposePlugin(name: string): void {
  // Do nothing if the name is not registered.
  if (!(name in pluginRegistry)) {
    return;
  }

  // Delete the registration record.
  let record = pluginRegistry[name];
  delete pluginRegistry[name];

  // Do nothing if the record is disposed or unloaded.
  if (record.state === RecordState.Disposed ||
      record.state === RecordState.Unloaded) {
    return;
  }

  // If the record is loading, mark it as disposed. The loader
  // will check for this condition and handle it on completion.
  if (record.state === RecordState.Loading) {
    record.state = RecordState.Disposed;
    return;
  }

  // Mark the plugin as disposed.
  record.state = RecordState.Disposed;

  // Dispose the plugin extensions.
  for (let ext of record.spec.extensions) {
    disposeExtension(ext.id);
  }

  // Dispose the plugin extension points.
  for (let point of record.spec.extensionPoints) {
    disposePoint(point.id);
  }
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
    safeDispose(this._item);
    this._item = null;
    this._data = null;
    this._config = null;
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
   * The full path to the main module for the extension, or `''`.
   */
  main: string;

  /**
   * The name of the factory function for the extension, or `''`.
   */
  factory: string;

  /**
   * The path to the JSON data file for the extension, or `''`.
   */
  data: string;

  /**
   * Extra static configuration data for the extension, or `null`.
   */
  config: any;
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
   */
  spec: IExtensionSpec;

  /**
   * The loaded extension object, or `null` if not yet loaded.
   */
  value: IExtension;

  /**
   * The loader promise for the record, or `null` if not loading.
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
 * @param record - The extension record of interest.
 *
 * @returns A promise which resolves when loading is complete.
 *
 * #### Notes
 * It is possible for the the record to be disposed before the loader
 * promise is resolved, so the caller must validate the record state
 * after resolving the returned promise.
 */
function loadExtension(record: IExtensionRecord): Promise<void> {
  // If the record is disposed or loaded, there is nothing to do.
  if (record.state === RecordState.Disposed ||
      record.state === RecordState.Loaded) {
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

    // Store the data for later use.
    data = argdata;

    // Load the main module, if given.
    return spec.main ? System.import(spec.main) : null;

  }).then(argmain => {

    // Store the main module for later use.
    main = argmain;

    // If there is no factory, skip to the next step.
    if (!main || !spec.factory) {
      return null;
    }

    // Throw an error if the factory is not a function.
    let factory = main[spec.factory];
    if (typeof factory !== 'function') {
      throw new Error(`Extension '${spec.id}' has invalid factory.`);
    }

    // Load the result of the factory.
    return factory();

  }).then(item => {

    // Clear the loader promise.
    record.promise = null;

    // If the record was disposed before reaching this point, release
    // the item. Otherwise, create the extension and update the record.
    if (record.state === RecordState.Disposed) {
      safeDispose(item);
    } else {
      record.value = Extension.create(spec, item, data);
      record.state = RecordState.Loaded;
    }

  }).catch(err => {

    // If an error occurs while loading, log it to the console.
    console.error(`Error occured while loading extension '${spec.id}'.`);
    console.error(err);

    // Clear the loader promise.
    record.promise = null;

    // Unregister the extension and mark it as disposed.
    delete extensionRegistry[spec.id];
    record.state = RecordState.Disposed;

  });

  // Update the record loading state.
  record.promise = promise;
  record.state = RecordState.Loading;

  // Return the new loader promise.
  return promise;
}


/**
 * Dispose of the extension record with the specified id.
 */
function disposeExtension(id: string): void {
  // Do nothing if the id is not registered.
  if (!(id in extensionRegistry)) {
    return;
  }

  // Delete the registration record.
  let record = extensionRegistry[id];
  delete extensionRegistry[id];

  // Do nothing if the record is disposed or unloaded.
  if (record.state === RecordState.Disposed ||
      record.state === RecordState.Unloaded) {
    return;
  }

  // If the record is loading, mark it as disposed. The loader
  // will check for this condition and handle it on completion.
  if (record.state === RecordState.Loading) {
    record.state = RecordState.Disposed;
    return;
  }

  // Remove the extension from any matching extension point.
  let other = pointRegistry[record.spec.point];
  if (other && other.value) other.value.remove(id);

  // Dispose of the extension.
  record.state = RecordState.Disposed;
  record.value.dispose();
}


//-----------------------------------------------------------------------------
// Extension Point Implementation
//-----------------------------------------------------------------------------

/**
 * A receiver object for an extension point.
 */
interface IReceiver {
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
 * Test whether an object implements `IReceiver`.
 */
function isReceiver(item: any): boolean {
  if (!item) return false;
  return typeof item.add === 'function' && typeof item.remove === 'function';
}


/**
 * A concrete implementation of `IExtensionPoint`.
 */
class ExtensionPoint implements IExtensionPoint {
  /**
   * Create a new extension point from a spec and receiver.
   *
   * @param spec - The specification for the extension point.
   *
   * @param receiver - The receiver for the extension point.
   */
  static create(spec: IPointSpec, receiver: IReceiver): ExtensionPoint {
    return new ExtensionPoint(spec.id, receiver);
  }

  /**
   * Construct a new extension point.
   *
   * @param id - The globally unique id of the extension point.
   *
   * @param receiver - The receiver for the extension point.
   */
  constructor(id: string, receiver: IReceiver) {
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
    safeDispose(this._receiver);
    this._receiver = null;
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
   */
  add(extension: IExtension): void {
    this._receiver.add(extension);
  }

  /**
   * Remove an extension from the extension point.
   */
  remove(id: string): void {
    this._receiver.remove(id);
  }

  private _id: string;
  private _disposed = false;
  private _receiver: IReceiver;
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
   * The full path to the main module for the extension point.
   */
  main: string;

  /**
   * The name of the factory function for the extension point.
   */
  factory: string;
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
   */
  spec: IPointSpec;

  /**
   * The loaded extension point object, or `null` if not yet loaded.
   */
  value: IExtensionPoint;

  /**
   * The loader promise for the record, or `null` if not loading.
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
 * @param record - The point record of interest.
 *
 * @returns A promise which resolves when loading is complete.
 *
 * #### Notes
 * If the point spec has no main module or no factory, the point must
 * be a manually loaded extension point.
 *
 * It is possible for the the record to be disposed before the loader
 * promise is resolved, so the caller must validate the record state
 * after resolving the returned promise.
 */
function loadPoint(record: IPointRecord): Promise<void> {
  // If the record is disposed or loaded, there is nothing to do.
  if (record.state === RecordState.Disposed ||
      record.state === RecordState.Loaded) {
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

    // Load the main module for the extension point.
    return System.import(spec.main);

  }).then(argmain => {

    // Store the main module for later use.
    main = argmain;

    // Throw an error if the factory is not a function.
    let factory = main[spec.factory];
    if (typeof factory !== 'function') {
      throw new Error(`Extension point '${spec.id}' has invalid factory.`);
    }

    // Load the result of the factory.
    return factory();

  }).then(receiver => {

    // Throw an error if the receiver interface is invalid.
    if (!isReceiver(receiver)) {
      throw new Error(`Extension point '${spec.id}' has invalid receiver.`);
    }

    // Clear the loader promise.
    record.promise = null;

    // If the record was disposed before reaching this point, release
    // the item. Otherwise, create the point and update the record.
    if (record.state === RecordState.Disposed) {
      safeDispose(receiver);
    } else {
      record.value = ExtensionPoint.create(spec, receiver);
      record.state = RecordState.Loaded;
    }

  }).catch(err => {

    // If an error occurs while loading, log it to the console.
    console.error(`Error occured while loading extension point '${spec.id}'.`);
    console.error(err);

    // Clear the loader promise.
    record.promise = null;

    // Unregister the extension point and mark it as disposed.
    delete pointRegistry[spec.id];
    record.state = RecordState.Disposed;

  });

  // Update the record loading state.
  record.promise = promise;
  record.state = RecordState.Loading;

  // Return the new loader promise.
  return promise;
}


/**
 * Dispose of the extension point record with the specified id.
 */
function disposePoint(id: string): void {
  // Do nothing if the id is not registered.
  if (!(id in pointRegistry)) {
    return;
  }

  // Delete the registration record.
  let record = pointRegistry[id];
  delete pointRegistry[id];

  // Do nothing if the record is disposed or unloaded.
  if (record.state === RecordState.Disposed ||
      record.state === RecordState.Unloaded) {
    return;
  }

  // If the record is loading, mark it as disposed. The loader
  // will check for this condition and handle it on completion.
  if (record.state === RecordState.Loading) {
    record.state = RecordState.Disposed;
    return;
  }

  // Dispose of the extension point.
  record.state = RecordState.Disposed;
  record.value.dispose();
}


//-----------------------------------------------------------------------------
// Extension Point Matching
//-----------------------------------------------------------------------------

/**
 * Load all matching extensions for the given point record.
 */
function loadMatchingExtensions(pRecord: IPointRecord): void {
  for (let key in extensionRegistry) {
    let eRecord = extensionRegistry[key];
    if (eRecord.spec.point === pRecord.spec.id) {
      loadMatch(pRecord, eRecord);
    }
  }
}


/**
 * Load the matching extension point for the given extension record.
 */
function loadMatchingPoint(eRecord: IExtensionRecord): void {
  let pRecord = pointRegistry[eRecord.spec.point];
  if (pRecord) loadMatch(pRecord, eRecord);
}


/**
 * Load and connect the matching point and extension records.
 */
function loadMatch(pRecord: IPointRecord, eRecord: IExtensionRecord): void {
  let p1 = loadPoint(pRecord);
  let p2 = loadExtension(eRecord);
  Promise.all([p1, p2]).then(() => {
    let s1 = pRecord.state === RecordState.Loaded;
    let s2 = eRecord.state === RecordState.Loaded;
    if (s1 && s2) pRecord.value.add(eRecord.value);
  });
}
