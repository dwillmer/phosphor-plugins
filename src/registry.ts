/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

import {
  IExtension, IExtensionSpec, loadExtension
} from './extension';

import {
  IExtensionPoint, IExtensionPointSpec, loadExtensionPoint
} from './point';


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
 * List the ids of the currently registered extensions.
 *
 * @returns A new array of the current extension ids.
 */
export
function listExtensions(): string[] {
  return Object.keys(extRegistry);
}


/**
 * Register an extension point and connect matching extensions.
 *
 * @param spec - The specification for the extension point.
 *
 * @returns A disposable which will unload the extension point.
 *
 * @throws An error if the extension point id is already registered.
 */
export
function registerExtensionPoint(spec: IExtensionPointSpec): IDisposable {
  if (spec.id in pointRegistry) {
    throw new Error(`Extension point ${spec.id} is already registered.`);
  }
  let record = createPointRecord(spec);
  pointRegistry[spec.id] = record;
  loadMatchingExts(record);
  return new DisposableDelegate(() => { disposePoint(spec.id); });
}


/**
 * Register an extension and connect matching extension points.
 *
 * @param spec - The specification for the extension point.
 *
 * @returns A disposable which will unload the extension point.
 *
 * @throws An error if the extension point id is already registered.
 */
export
function registerExtension(spec: IExtensionSpec): IDisposable {
  if (spec.id in extRegistry) {
    throw new Error(`Extension ${spec.id} is already registered.`);
  }
  let record = createExtRecord(spec);
  extRegistry[spec.id] = record;
  loadMatchingPoint(record);
  return new DisposableDelegate(() => { disposeExt(spec.id); });
}


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
 * A registration record for an extension point.
 */
interface IPointRecord {
  /**
   * The lifecycle state of the record.
   */
  state: RecordState;

  /**
   * The specification of the extension point.
   */
  spec: IExtensionPointSpec;

  /**
   * The extension point object.
   *
   * This will be null until the record is fully loaded.
   */
  value: IExtensionPoint;

  /**
   * The loader promise for the record.
   *
   * This will be null unless the record is loading.
   */
  promise: Promise<void>;
}


/**
 * A registration record for an extension.
 */
interface IExtRecord {
  /**
   * The lifecycle state of the record.
   */
  state: RecordState;

  /**
   * The specification of the extension.
   */
  spec: IExtensionSpec;

  /**
   * The extension object.
   *
   * This will be null until the record is fully loaded.
   */
  value: IExtension;

  /**
   * The loader promise for the record.
   *
   * This will be null unless the record is loading.
   */
  promise: Promise<void>;
}


/**
 * A type alias for a string map.
 */
type StringMap<T> = { [id: string]: T };


/**
 * A mapping of extension point id to extension point record.
 */
var pointRegistry: StringMap<IPointRecord> = Object.create(null);


/**
 * A mapping of extension id to extension record.
 */
var extRegistry: StringMap<IExtRecord> = Object.create(null);


/**
 * Create a new registration record for an extension point.
 */
function createPointRecord(spec: IExtensionPointSpec): IPointRecord {
  return { spec, state: RecordState.Unloaded, value: null, promise: null };
}


/**
 * Create a new registration record for an extension.
 */
function createExtRecord(spec: IExtensionSpec): IExtRecord {
  return { spec, state: RecordState.Unloaded, value: null, promise: null };
}


/**
 * Dispose of the extension point with the specified id.
 */
function disposePoint(id: string): void {
  // Do nothing if the id is not registered.
  if (!(id in pointRegistry)) {
    return;
  }

  // Delete the registration record.
  let record = pointRegistry[id];
  delete pointRegistry[id];

  // If the record is unloaded or disposed, there is nothing to do.
  if (record.state === RecordState.Unloaded ||
      record.state === RecordState.Disposed) {
    return;
  }

  // If the record is loading, mark it as disposed. The loader
  // will check for this condition and handle it on completion.
  if (record.state === RecordState.Loading) {
    record.state = RecordState.Disposed;
    return;
  }

  // Otherwise, dispose of the extension point.
  record.state = RecordState.Disposed;
  record.value.dispose();
  record.value = null;
}


/**
 * Dispose of the extension with the specified id.
 */
function disposeExt(id: string): void {
  // Do nothing if the id is not registered.
  if (!(id in extRegistry)) {
    return;
  }

  // Delete the registration record.
  let record = extRegistry[id];
  delete extRegistry[id];

  // If the record is unloaded or disposed, there is nothing to do.
  if (record.state === RecordState.Unloaded ||
      record.state === RecordState.Disposed) {
    return;
  }

  // If the record is loading, mark it as disposed. The loader
  // will check for this condition and handle it on completion.
  if (record.state === RecordState.Loading) {
    record.state = RecordState.Disposed;
    return;
  }

  // Remove the extension from its matching point, if any.
  let other = pointRegistry[record.spec.point];
  if (other && other.value) other.value.remove(id);

  // Dispose of the extension.
  record.state = RecordState.Disposed;
  record.value.dispose();
  record.value = null;
}


/**
 * Fully load the contents of an extension point record.
 *
 * The record may be disposed before the returned promise is resolved,
 * so the caller should validate the record state after resolving the
 * promise.
 */
function loadPointRecord(record: IPointRecord): Promise<void> {
  // If the record is loaded or disposed, there is nothing to do.
  if (record.state === RecordState.Loaded ||
      record.state === RecordState.Disposed) {
    return Promise.resolve<void>();
  }

  // If the record is loading, return the pending promise.
  if (record.state === RecordState.Loading) {
    return record.promise;
  }

  // Create the promise which will load the extension point. The
  // record may be disposed before the promise resolves, so that
  // condition is checked and handled as necessary. Otherwise,
  // the record state is updated to indicate the loaded state.
  let promise = loadExtensionPoint(record.spec).then(point => {
    if (record.state === RecordState.Disposed) {
      record.promise = null;
      point.dispose();
    } else {
      record.promise = null;
      record.value = point;
      record.state = RecordState.Loaded;
    }
  });

  // Update the record to the loading state.
  record.promise = promise;
  record.state = RecordState.Loading;

  // Return the pending promise.
  return promise;
}


/**
 * Fully load the contents of an extension record.
 *
 * The record may be disposed before the returned promise is resolved,
 * so the caller should validate the record state after resolving the
 * promise.
 */
function loadExtRecord(record: IExtRecord): Promise<void> {
  // If the record is loaded or disposed, there is nothing to do.
  if (record.state === RecordState.Loaded ||
      record.state === RecordState.Disposed) {
    return Promise.resolve<void>();
  }

  // If the record is loading, return the pending promise.
  if (record.state === RecordState.Loading) {
    return record.promise;
  }

  // Create the promise which will load the extension. The record
  // may be disposed before the promise resolves, so that condition
  // is checked and handled as necessary. Otherwise, the record state
  // is updated to indicate the loaded state.
  let promise = loadExtension(record.spec).then(extension => {
    if (record.state === RecordState.Disposed) {
      record.promise = null;
      extension.dispose();
    } else {
      record.promise = null;
      record.value = extension;
      record.state = RecordState.Loaded;
    }
  });

  // Update the record to the loading state.
  record.promise = promise;
  record.state = RecordState.Loading;

  // Return the pending promise.
  return promise;
}


/**
 * Load and match all registered extensions for a given point.
 */
function loadMatchingExts(pointRecord: IPointRecord): void {
  for (let key in extRegistry) {
    let extRecord = extRegistry[key];
    if (extRecord.spec.point === pointRecord.spec.id) {
      loadMatch(pointRecord, extRecord);
    }
  }
}


/**
 * Load and match a registered point for the extension, if one exists.
 */
function loadMatchingPoint(extRecord: IExtRecord): void {
  if (extRecord.spec.point in pointRegistry) {
    let pointRecord = pointRegistry[extRecord.spec.point];
    loadMatch(pointRecord, extRecord);
  }
}


/**
 * Load and install the matching pair of records.
 *
 * This will load and resolve the loader promises for both records.
 * Once both promises are successfully resolved, the extension will
 * be added to the extension point.
 *
 * If either record is disposed during loading, this is a no-op.
 */
function loadMatch(pointRecord: IPointRecord, extRecord: IExtRecord): void {
  let p1 = loadExtRecord(extRecord);
  let p2 = loadPointRecord(pointRecord);
  Promise.all([p1, p2]).then(() => {
    if (extRecord.state !== RecordState.Loaded) {
      return;
    }
    if (pointRecord.state !== RecordState.Loaded) {
      return;
    }
    pointRecord.value.add(extRecord.value);
  }).catch(e => {
    console.error(e);
  });
}
