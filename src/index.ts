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
 * An object which represents a contribution to an extension point.
 *
 * Objects of this type are created by an extension factory function
 * to provide a behavioral object to a matching extension point.
 *
 * This type is not used for manually registered extensions.
 */
export
interface IContrib {
  /**
   * The behavioral object to provide to the extension point.
   */
  item: any;

  /**
   * Dispose of the resources held by the extension.
   *
   * If this method is provided, it will be invoked when the plugin
   * which registered the extension is unloaded.
   */
  dispose?(): void;
}


/**
 * A receiver object for an extension point.
 *
 * Objects of this type are created by an extension point factory
 * function to handle addition and removal of matching extensions.
 *
 * This type is not used for manually registered extension points.
 */
export
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

  /**
   * Dispose of the resources held by the receiver.
   *
   * If this method is provided, it will be invoked when the plugin
   * which registered the extension point is unloaded.
   */
  dispose?(): void;
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
  };

  // Add the record to the plugin registry.
  pluginRegistry[name] = record;

  // Load the plugin record.
  loadPlugin(record);

  // Return a disposable which will unload the plugin.
  return new DisposableDelegate(() => { disposePlugin(name); });
}


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
  };

  // Create a new loaded record for the extension.
  let record: IExtensionRecord = {
    state: RecordState.Loaded,
    spec: spec,
    value: extension,
    promise: null,
  };

  // Add the record to the extension registry.
  extensionRegistry[spec.id] = record;

  // Load any matching extension point.
  loadMatchingPoint(record);

  // Return a disposable which will unload the extension.
  return new DisposableDelegate(() => { disposeExtension(spec.id); });
}


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
export
function registerExtensionPoint(point: IExtensionPoint): IDisposable {
  // Throw an error if the extension point id is registered.
  if (point.id in pointRegistry) {
    throw new Error(`Extension point '${point.id}' is already registered.`);
  }

  // Create a compatible spec for the extension point.
  let spec: IPointSpec = {
    id: point.id,
  };

  // Create a new loaded record for the extension.
  let record: IPointRecord = {
    state: RecordState.Loaded,
    spec: spec,
    value: point,
    promise: null,
  };

  // Add the record to the registry.
  pointRegistry[spec.id] = record;

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
function safeDispose(obj: any): void {
  if (obj && typeof obj.dispose === 'function') {
    try {
      obj.dispose();
    } catch (err) {
      console.error(err);
    }
  }
}


/**
 * Test whether loaded JSON data is an object.
 */
function isObject(jsonData: any): boolean {
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
 * Test whether a non-null object implements `IContrib`.
 */
function isContrib(obj: any): boolean {
  return 'item' in obj;
}


/**
 * Test whether a non-null object implements `IReceiver`.
 */
function isReceiver(obj: any): boolean {
  return typeof obj.add === 'function' && typeof obj.remove === 'function';
}


//-----------------------------------------------------------------------------
// Plugin Implementation
//-----------------------------------------------------------------------------

/**
 * An object which provides the specification for a plugin.
 */
interface IPluginSpec {
  /**
   * The name of the plugin.
   */
  name: string;

  /**
   * The extension specs for the plugin.
   */
  extensions: IExtensionSpec[];

  /**
   * The extension point specs for the plugin.
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
}


/**
 * A mapping of plugin name to plugin record.
 */
var pluginRegistry = createMap<IPluginRecord>();


/**
 * Ensure a plugin record is fully loaded.
 */
function loadPlugin(record: IPluginRecord): void {
  // If the record is not unloaded, there is nothing to do.
  if (record.state !== RecordState.Unloaded) {
    return;
  }

  // Set the record state to loading.
  record.state = RecordState.Loading;

  // Kick off the promise loading chain.
  Promise.resolve().then(() => {

    // Load the plugin package JSON.
    return System.import(`${record.name}/package.json`);

  }).then(pkg => {

    // Do nothing if the record has been disposed.
    if (record.state === RecordState.Disposed) {
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
    record.spec = createPluginSpec(record.name, pkg['phosphor-plugin']);
    record.state = RecordState.Loaded;

    // Register the plugin extension points.
    for (let point of record.spec.extensionPoints) {
      registerPointSpec(point);
    }

    // Register the plugin extensions.
    for (let ext of record.spec.extensions) {
      registerExtensionSpec(ext);
    }

  }).catch(err => {

    // If an error occurs while loading, log it to the console.
    console.error(`Error occured while loading plugin '${record.name}'.`);
    console.error(err);

    // Unregister the plugin and mark it as disposed.
    delete pluginRegistry[record.name];
    record.state = RecordState.Disposed;

  });
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


/**
 * Create a plugin spec from plugin JSON data.
 *
 * This will throw error if any part of the data is invalid.
 */
function createPluginSpec(name: string, plugin: any): IPluginSpec {
  // Assert the plugin is an object.
  if (!isObject(plugin)) {
    throw new Error('Plugin must be an object.');
  }

  // Create the extension specs for the plugin.
  let extensions = createExtensionSpecs();

  // Create the point specs for the plugin.
  let extensionPoints = createPointSpecs();

  // Return the new plugin spec.
  return { name, extensions, extensionPoints };

  // Create the array of extension specs.
  function createExtensionSpecs(): IExtensionSpec[] {
    if (!('extensions' in plugin)) {
      return [];
    }

    if (!(plugin.extensions instanceof Array)) {
      throw new Error('`extensions` must be an array.');
    }

    return plugin.extensions.map(createExtensionSpec);
  }

  // Create the array of extension point specs.
  function createPointSpecs(): IPointSpec[] {
    if (!('extensionPoints' in plugin)) {
      return [];
    }

    if (!(plugin.extensionPoints instanceof Array)) {
      throw new Error('`extensionPoints` must be an array.');
    }

    return plugin.extensionPoints.map(createPointSpec);
  }

  // Create an extension spec from extension JSON data.
  function createExtensionSpec(ext: any): IExtensionSpec {
    if (!isObject(ext)) {
      throw new Error('Extension must be an object.');
    }

    if (typeof ext.id !== 'string') {
      throw new Error('Extension `id` must be a string.');
    }

    if (typeof ext.point !== 'string') {
      throw new Error('Extension `point` must be a string.');
    }

    let spec: IExtensionSpec = { id: ext.id, point: ext.point, plugin: name };

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
  function createPointSpec(point: any): IPointSpec {
    if (!isObject(point)) {
      throw new Error('Extension point must be an object.');
    }

    if (typeof point.id !== 'string') {
      throw new Error('Extension point `id` must be a string.');
    }

    let spec: IPointSpec = { id: point.id, plugin: name };

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
class Extension implements IExtension {
  /**
   * Create a new extension from a spec, contrib, and data.
   *
   * @param spec - The specification for the extension.
   *
   * @param contrib - The contribution for the extension, or `null`.
   *
   * @param data - The parsed JSON data for the extension, or `null`.
   *
   * @returns A new extension instance.
   */
  static create(spec: IExtensionSpec, contrib: IContrib, data: any): Extension {
    return new Extension(spec.id, spec.point, contrib, data, spec.config);
  }

  /**
   * Construct a new extension.
   *
   * @param id - The globally unique identifier of the extension.
   *
   * @param point - The identifier of the target extension point.
   *
   * @param contrib - The contribution for the extension, or `null`.
   *
   * @param data - The parsed JSON data for the extension, or `null`.
   *
   * @param config - The static configuration data, or `null`.
   */
  constructor(id: string, point: string, contrib: IContrib, data: any, config: any) {
    this._id = id;
    this._point = point;
    this._data = data || null;
    this._config = config || null;
    this._contrib = contrib || null;
  }

  /**
   * Dispose of the resources held by the extension.
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    let temp = this._contrib;
    this._data = null;
    this._config = null;
    this._contrib = null;
    safeDispose(temp);
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
    return this._contrib ? this._contrib.item : null;
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
  private _data: any;
  private _config: any;
  private _disposed = false;
  private _contrib: IContrib;
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
   * The name of the plugin which owns the extension.
   */
  plugin?: string;

  /**
   * The relative path to the extension main module.
   */
  main?: string;

  /**
   * The name of the factory function for the extension.
   */
  factory?: string;

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
 * Register an extension spec and load the matching extension point.
 *
 * If the extension id is already registered, an error will be logged
 * and the registration will be ignored.
 */
function registerExtensionSpec(spec: IExtensionSpec): void {
  // Log an error if the extension id is already registered.
  if (spec.id in extensionRegistry) {
    console.error(`Extension '${spec.id}' is already registered.`);
    return;
  }

  // Create a new unloaded record for the extension.
  let record: IExtensionRecord = {
    state: RecordState.Unloaded,
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

  // Setup local variables.
  let spec = record.spec;
  let data: any = null;

  // Kick off the promise loading chain.
  let promise = Promise.resolve().then(() => {

    // Load the extension JSON data, if given. Extensions which
    // are manually registered will always have a null data file.
    return spec.data ? System.import(`${spec.plugin}/${spec.data}`) : null;

  }).then(argdata => {

    // Store the data for later use.
    data = argdata;

    // Load the main module for the extension. Extensions which
    // are manually registered will always have a null main module.
    return spec.main ? System.import(`${spec.plugin}/${spec.main}`) : null;

  }).then(main => {

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

  }).then(contrib => {

    // Throw an error if the contribution interface is invalid.
    if (contrib && !isContrib(contrib)) {
      throw new Error(`Extension '${spec.id}' has invalid contribution.`);
    }

    // Clear the loader promise.
    record.promise = null;

    // If the record was disposed before reaching this point, release
    // the item. Otherwise, create the extension and update the record.
    if (record.state === RecordState.Disposed) {
      safeDispose(contrib);
    } else {
      record.value = Extension.create(spec, contrib, data);
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
 * A concrete implementation of `IExtensionPoint`.
 */
class ExtensionPoint implements IExtensionPoint {
  /**
   * Create a new extension point from a spec and receiver.
   *
   * @param spec - The specification for the extension point.
   *
   * @param receiver - The receiver for the extension point, or `null`.
   */
  static create(spec: IPointSpec, receiver: IReceiver): ExtensionPoint {
    return new ExtensionPoint(spec.id, receiver);
  }

  /**
   * Construct a new extension point.
   *
   * @param id - The globally unique id of the extension point.
   *
   * @param receiver - The receiver for the extension point, or `null`.
   */
  constructor(id: string, receiver: IReceiver) {
    this._id = id;
    this._receiver = receiver || null;
  }

  /**
   * Dispose of the resources held by the extension point.
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    let temp = this._receiver;
    this._receiver = null;
    safeDispose(temp);
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
    if (this._receiver) this._receiver.add(extension);
  }

  /**
   * Remove an extension from the extension point.
   */
  remove(id: string): void {
    if (this._receiver) this._receiver.remove(id);
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
   * The name of the plugin which owns the point.
   */
  plugin?: string;

  /**
   * The relative path to the extension point main module.
   */
  main?: string;

  /**
   * The name of the factory function for the extension point.
   */
  factory?: string;
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
 * Register an extension point spec and load any matching extensions.
 *
 * If the point id is already registered, an error will be logged
 * and the registration will be ignored.
 */
function registerPointSpec(spec: IPointSpec): void {
  // Log an error if the extension point id is already registered.
  if (spec.id in pointRegistry) {
    console.error(`Extension point '${spec.id}' is already registered.`);
    return;
  }

  // Create a new unloaded record for the point.
  let record: IPointRecord = {
    state: RecordState.Unloaded,
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

  // Setup local variables.
  let spec = record.spec;

  // Kick off the loader promise chain.
  let promise = Promise.resolve().then(() => {

    // Load the main module for the extension point. Points which
    // are manually registered will always have a null main module.
    return spec.main ? System.import(`${spec.plugin}/${spec.main}`) : null;

  }).then(main => {

    // If there is no factory, skip to the next step.
    if (!main || !spec.factory) {
      return null;
    }

    // Throw an error if the factory is not a function.
    let factory = main[spec.factory];
    if (typeof factory !== 'function') {
      throw new Error(`Extension point '${spec.id}' has invalid factory.`);
    }

    // Load the result of the factory.
    return factory();

  }).then(receiver => {

    // Throw an error if the receiver interface is invalid.
    if (receiver && !isReceiver(receiver)) {
      throw new Error(`Extension point '${spec.id}' has invalid receiver.`);
    }

    // Clear the loader promise.
    record.promise = null;

    // If the record was disposed before reaching this point, release
    // the receiver. Otherwise, create the point and update the record.
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
