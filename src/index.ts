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


// stub for System
declare var System: any;


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
}


export
interface IPluginJSON {
  /**
   * The path to the "main" javascript file for the plugin.
   *
   * This path is relative to the `package.json`.
   */
  main: string;

  /**
   * The extension points provided by the plugin.
   *
   * Other plugins may contribute extensions to these extension points.
   */
  extensionPoints?: IExtensionPointJSON[];

  /**
   * The extensions provided by the plugin.
   *
   * These are contributions to extension points of other plugins.
   */
  extensions?: IExtensionJSON[];
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
 * Get a list of available plugin names.
 */
export 
function listPlugins(): Promise<string[]> {
  return gatherPlugins().then(() => { 
    return (Array as any).from(pluginReg.keys()); 
  });
}


/**
 * Load a plugin by name.
 *
 * Load all extension points and extensions, then call `initialize`.
 *
 * Throws an error if the plugin is not in the registry.
 */
export
function loadPlugin(name: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    gatherPlugins().then(() => {
      var plugin = pluginReg.get(name);
      if (!plugin) reject(Error('Plugin not in registry'));

      System.import(name + '/' + plugin.main).then((mod: any) => {
        var promises: Promise<void>[] = [];
        // load all extension points and extensions
        if (plugin.hasOwnProperty('extensionPoints')) {
          plugin.extensionPoints.map((point) => {
            promises.push(loadExtensionPoint(name, mod, point));
          });
        }
        if (plugin.hasOwnProperty('extensions')) {
          plugin.extensions.map((ext) => {
            promises.push(loadExtension(name, mod, ext));
          });
        }
        Promise.all(promises).then(() => {
          // initialize the plugin
          if (mod.hasOwnProperty('initialize')) {
            var disposable = mod.initialize();
            if (disposable.hasOwnProperty('dispose')) {
              var disposables = disposableReg.get(name) || [];
              disposables.push(disposable);
              disposableReg.set(name, disposables);  
            }
          }
          resolve(void 0);
        }, reject);
      }, reject);
    }, reject);
  });
}


/**
 * Unload a plugin by name, disposing of its resources.
 *
 * This is a no-op if the plugin has not been loaded or has already 
 * been unloaded.
 */
export
function unloadPlugin(name: string): void {
  var disposables = disposableReg.get(name) || [];
  disposables.map((disposable) => {
    try {
      disposable.dispose();
    } catch (e) {
      console.error(e);
    }
  });
}


/**
 * Gather all available plugins.
 *
 * This is a no-op if the plugins have already been gathered.
 */
function gatherPlugins(): Promise<void> {
  if (pluginReg !== null) {
    return Promise.resolve(void 0);
  }
  pluginReg = new Map<string, IPluginJSON>();
  var promises: Promise<void>[] = [];
  // fetch the metadata about available plugins
  for (var key in System.npmPaths) {
    var obj = System.npmPaths[key];
    // check for one occurrence of `node_modules` in the fileUrl
    var fileUrl = obj.fileUrl;
    var index = fileUrl.indexOf('node_modules');
    var lastIndex = fileUrl.lastIndexOf('node_modules');
    if (index > 0 && index === lastIndex) {
      promises.push(loadPackage(obj.name));
    }
  }
  return Promise.all(promises).then(() => { return void 0; });
}


/**
 * Load a package by name and add to plugin registry if valid plugin.
 */
function loadPackage(name: string): Promise<void> {
  return System.import(name + '/package.json').then((config: any) => {
    if ((config.hasOwnProperty('phosphide')) &&
        (config.phosphide.hasOwnProperty('main'))) {
      var pconfig = config.phosphide;
      var plugin: IPluginJSON = { main: pconfig.main };
      if (pconfig.hasOwnProperty('extensionPoints')) {
        var points: IExtensionPointJSON[] = [];
        pconfig.extensionPoints.map((point: IExtensionPointJSON) => {
          if ((point.hasOwnProperty('id')) &&
              (point.hasOwnProperty('receiver'))) {
            points.push(point);
          }
        });
        plugin.extensionPoints = points;
      }
      if (pconfig.hasOwnProperty('extensions')) {
        plugin.extensions = pconfig.extensions;
      }
      pluginReg.set(name, plugin);
    }
  }).catch((error: any) => {
    console.error('Failed to load plugin: ' + name);
    console.error(error);
  });
}


/**
 * Load an extension point and any existing extensions matching the point.
 */
function loadExtensionPoint(name: string, mod: any, point: IExtensionPointJSON): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    var receiver = mod[point.receiver];
    extensionPointReg.set(point.id,  receiver);
    var extensions = extensionReg.get(point.id);
    if (extensions) {
      var promises: Promise<void>[] = [];
      extensions.map((pExt) => {
        promises.push(connectExtension(name, receiver, pExt));
      });
      Promise.all(promises).then(() => resolve(void 0));
    }
    resolve(void 0);
  }).catch((error) => {
    console.error('Failed to load extension point: ' + point.id);
    console.error(error);
  });
}


/**
 * Load an extension.  
 *
 * If the extenstion point exists, finish loading. 
 * Otherwise, store the partially loaded extension point.
 */
function loadExtension(name: string, mod: any, ext: IExtensionJSON): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (ext.loader) {
      var loader = mod[ext.loader];
    } else {
      var loader = null;
    }
    var pExt: IExtensionPartial = {
      loader: loader,
      data: ext.data,
      config: ext.config,
    }
    var receiver = extensionPointReg.get(ext.point);
    if (receiver) {
      connectExtension(name, receiver, pExt).then(resolve, reject);
    } else {
      var pExts = extensionReg.get(ext.point) || [];
      pExts.push(pExt);
      extensionReg.set(ext.point, pExts);
      resolve(void 0);
    }
  }).catch((error) => {
    console.error('Failed to load extension: ' + name + ' to ' + ext.point);
    console.error(error);
  });
}


/**
 * Finish loading an extension to the extension point.
 *
 * This is an intermediate step to handle optionally loading json data.
 */
function connectExtension(name: string, receiver: (ext: IExtension<any>) =>IDisposable, pExt: IExtensionPartial): Promise<void> {
  
  return new Promise<void>((resolve, reject) => {
    var promises: Promise<void>[] = [];
    var ext: IExtension<any> = {
      data: null,
      object: null,
      config: pExt.config || null
    }
    // check for json data to load
    if ((pExt.data !== void 0) && (pExt.data.indexOf('.json') > 0)) {
      promises.push(System.import(name + '/' + pExt.data).then((data: any) => {
        ext.data = data;
      }));
    } 
    // check for a loader function
    if (pExt.loader) {
      promises.push(pExt.loader().then(obj => { ext.object = obj; }));
    }
    Promise.all(promises).then(() => {
      var disposable = receiver(ext);
      if (disposable.hasOwnProperty('dispose')) {
        var disposables = disposableReg.get(name) || [];
        disposables.push(disposable);
        disposableReg.set(name, disposables);  
      }
      resolve(void 0);
    }, reject);
  });
}


interface IExtensionPartial {
  /**
   * The function that loads the extension.
   */
  loader?: () => Promise<any>;

  /**
   * The path to the JSON data file, and then the actual object content.
   */
  data?: any;

  /**
   * Extra configuration data for the extension.
   */
  config?: any;
}


// Map of plugins by name.
var pluginReg: Map<string, IPluginJSON> = null;


// Map of extension points by point id.
var extensionPointReg = new Map<string, (ext: IExtension<any>) => IDisposable>();


// Map of partial extensions by point id.
var extensionReg = new Map<string, IExtensionPartial[]>();


// Map of disposables by plugin.
var disposableReg = new Map<string, IDisposable[]>();
