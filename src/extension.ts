/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  IDisposable, DisposableDelegate, DisposableSet
} from 'phosphor-disposable';


export
interface IExtensionJSON {
  /**
   * The id of the extension point to which the extension contributes.
   */
  point: string;

  /**
   * The name of the loader function in the plugin `main` module.
   *
   * When the extension is loaded, this function will be called to
   * return a Promise which resolves to the actual extension object
   * to contribute to the extension point.
   */
  loader?: string;

  /**
   * The path to the JSON data file for the extension.
   *
   * Some extension points (like menus and keymaps) can make use of
   * data defined as JSON. This path will be used to load the JSON
   * and provide it to the extension point.
   */
  data?: string;

  /**
   * Extra configuration data for the extension.
   *
   * Some extension points can make use of extra static declarative
   * data associated with an extension. That data goes here in the
   * form of a JSON object.
   */
  config?: any;

  /**
   * The path to the javascript module for the extension.
   *
   * This path is relative to the `package.json`.
   *
   * If not given, it will default to plugin main file.
   */
   module?: string;

  /**
   * The name of the initialization function for the extension.
   *
   * When the extension is loaded, this function will be called to
   * return a Promise<Disposable> object.
   */
  initializer?: string;
}


export
interface IExtensionPointJSON {
  /**
   * The unique id of the extension point.
   *
   * This should be namespaced: "my-plugin:extension-point-name".
   */
  id: string;

  /**
   * The name of the receiver function in the plugin `main` module.
   *
   * When an extension is loaded for this extension point, this
   * function will be invoked with an `IExtension` object.
   */
  receiver: string;

  /**
   * The path to the javascript module for the extension point.
   *
   * This path is relative to the `package.json`.
   *
   * If not given, it will default to plugin main file.
   */
   module?: string;

  /**
   * The name of the initialization function for the extension point.
   *
   * When the extension point is loaded, this function will be called to
   * return a Promise<Disposable> object.
   */
  initializer?: string;
}


export
interface IExtension<T> {
  /**
   * The actual extension object.
   *
   * This is the result of resolving the Promise returned by
   * the loader function specified by the extension JSON.
   *
   * This will be `null` if the extension does not specify a loader.
   */
  object: T;

  /**
   * The loaded JSON specified by the extension.
   *
   * This is the result of calling `JSON.parse` on the data file
   * specified by the extension JSON.
   *
   * This will be `null` if the extension does not specify a data file.
   */
  data: any;

  /**
   * The config specified by the extension.
   *
   * This will be the object representation of the config specified
   * in the extension JSON.
   *
   * This will be `null` if the extension does not specify a data file.
   */
  config: any;
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
    console.log('connecting to', this._id);
    if (!this._initialized) {
      return new Promise<void>((resolve, reject) => {
        this._load().then(() => {
          this._connectExtension(extension).then(() => {
            resolve(void 0);
          }, reject);
        }, reject);
      })
    } else {
      return this._connectExtension(extension);
    }
  }

  /**
   * Load the extension point.
   */
  private _load(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      System.import(this._module).then(mod => {
        this._receiverFunc = mod[this._receiver].bind(this);
        resolve(this._initialize());
      }, reject);
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
    return new Promise<void>((resolve, reject) => {
      System.import(this._module).then(mod => {
        mod[this._initializer]().then((result: IDisposable) => {
          if (result.hasOwnProperty('dispose')) {
            this._disposables.add(result);
          }
        }, reject);
      }, reject);
    });
  }

  /**
   * Finish connecting and extension to the extension point.
   */
  private _connectExtension(extension: Extension): Promise<void> {
    console.log('connect extension', this._id);
    var receiver = this._receiverFunc;
    return new Promise<void>((resolve, reject) => {
      extension.load().then((result: IExtension<any>) => {
        var disposable = receiver(result);
        if (disposable.hasOwnProperty('dispose')) {
           this._disposables.add(disposable);
        }
        extension.initialize();
        resolve(void 0);
      }, reject);
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
      return new Promise<void>((resolve, reject) => {
        System.import(this._module).then(mod => {
          var initializer = mod[this._initializer];
          var disposable = initializer();
          if (disposable.hasOwnProperty('dispose')) {
            this._disposables.add(disposable);
          }
          resolve(void 0);
        }, reject);
      });
    } else {
      return Promise.resolve(void 0);
    }
  }

  /**
   * Load the extension.
   */
  load(): Promise<IExtension<any>> {
    return new Promise<IExtension<any>>((resolve, reject) => {
      Promise.all([this._loadData(), this._loadObject()])
      .then(() => { resolve(this._extension); } , reject);
    });
  }

  /**
   * Load the data for the extension.
   */
  private _loadData(): Promise<void> {
    if (!this._data) {
      return Promise.resolve(void 0);
    }
    return new Promise<void>((resolve, reject) => {
      System.import(this._data).then(data => {
        this._extension.data = data;
        resolve(void 0);
      }, reject);
    });
  }

  /**
   * Load the object for the extension.
   */
  private _loadObject(): Promise<void> {
    if (!this._loader) {
      return Promise.resolve(void 0);
    }
    return new Promise<void>((resolve, reject) => {
      System.import(this._module).then(mod => { 
        var loader = mod[this._loader] as (() => Promise<any>);
        loader().then((result: any) => {
          this._extension.object = result;
          resolve(void 0);
        }, reject);
      }, reject);
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


/**
 * Load an extension point, connecting any existing matching extensions.
 */
export
function loadExtensionPoint(config: IExtensionPointJSON): Promise<IDisposable> {
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
  return new Promise<IDisposable>((resolve, reject) => {
    Promise.all(promises).then(() => { resolve(point); }, reject);
  });
}


/**
 * Load an extension, connecting to the corresponding extension point exists.
 */
export
function loadExtension(config: IExtensionJSON): Promise<IDisposable> {
  var extension = new Extension(config);
  var point = allExtensionPoints.get(config.point);
  if (point) {
    return new Promise<IDisposable>((resolve, reject) => {
      point.connect(extension).then(() => { resolve(extension); }, reject);
    });
  }
  var extensions = allExtensions.get(config.point) || [];
  extensions.push(extension);
  allExtensions.set(config.point, extensions);
  return Promise.resolve(extension);
}


// Map of available extension points by point id.
var allExtensionPoints = new Map<string, ExtensionPoint>();

// Map of available extensions by point id.
var allExtensions = new Map<string, Extension[]>();
