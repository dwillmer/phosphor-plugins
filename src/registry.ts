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
  return Object.keys(extensionRegistry);
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
  loadMatchingExtensions(record);
  return new DisposableDelegate(() => disposePoint(spec.id));
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
  if (spec.id in extensionRegistry) {
    throw new Error(`Extension ${spec.id} is already registered.`);
  }
  let record = createExtensionRecord(spec);
  extensionRegistry[spec.id] = record;
  loadMatchingPoint(record);
  return new DisposableDelegate(() => disposeExtension(spec.id));
}


/**
 * A type alias for a string map.
 */
type StringMap<T> = { [id: string]: T };


/**
 *
 */
const enum LifecycleState {
  /**
   *
   */
  Unloaded,

  /**
   *
   */
  Loading,

  /**
   *
   */
  Loaded,

  /**
   *
   */
  Disposed,
}


/**
 *
 */
interface IPointRecord {
  /**
   *
   */
  state: LifecycleState;

  /**
   *
   */
  spec: IExtensionPointSpec;

  /**
   *
   */
  point: IExtensionPoint;
}


/**
 *
 */
interface IExtensionRecord {
  /**
   *
   */
  state: LifecycleState;

  /**
   *
   */
  spec: IExtensionSpec;

  /**
   *
   */
  extension: IExtension;
}


/**
 * A mapping of extension point id to extension point manager.
 */
var pointRegistry: StringMap<IPointRecord> = Object.create(null);


/**
 * A mapping of extension id to extension manager.
 */
var extensionRegistry: StringMap<IExtensionRecord> = Object.create(null);


/**
 *
 */
function createPointRecord(spec: IExtensionPointSpec): IPointRecord {

}


/**
 *
 */
function createExtensionRecord(spec: IExtensionSpec): IExtensionRecord {

}


/**
 *
 */
function disposePoint(id: string): void {

}


/**
 *
 */
function disposeExtension(id: string): void {

}


/**
 *
 */
function loadMatchingExtensions(record: IPointRecord): void {

}


/**
 *
 */
function loadMatchingPoint(record: IExtensionRecord): void {

}
