/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  ICommandMenuItem
} from './menuiteminterface';

import {
  IMenuManager
} from './menumanagerinterface'

import {
  MenuSolver
} from './menusolver';

import {
  IExtension
} from '../../../lib/index';

import {
  IDisposable, DisposableDelegate, DisposableSet
} from 'phosphor-disposable';

import {
  Menu, MenuBar, MenuItem
} from 'phosphor-menus';

import {
  Signal, ISignal
} from 'phosphor-signaling';

import {
  attachWidget, detachWidget
} from 'phosphor-widget';


import './index.css';

export * from './constraints';
export * from './menuiteminterface';
export * from './menumanagerinterface';
export * from './menusolver';
export * from './menusolverfunctions';


/**
 * The interface required for menu items.
 */
export
interface IItems {
  items: ICommandMenuItem[];
}


export
function receiveItems(extension: IExtension<IItems>): IDisposable {
  var disposables: IDisposable[] = [];

  if (extension.object && extension.object.hasOwnProperty('items')) {
    console.log('got items', extension.object.items.length);
    extension.object.items.forEach(item => {
      var disp = addToMenuItems(item);
      disposables.push(disp);
    });
  } 
  if (extension.data && extension.data.hasOwnProperty('items')) {
    extension.data.items.forEach((item: ICommandMenuItem) => {
      var disp = addToMenuItems(item);
      disposables.push(disp);
    });
  }
  if (menuBar) detachWidget(menuBar);
  menuBar = MenuSolver.solve(menuItems);
  attachWidget(menuBar, document.body);
  console.log('attached', menuItems.length);
  return new DisposableSet(disposables);
}


export
function initialize(): Promise<IDisposable> {
  return new Promise((resolve, reject) => {
    menuBar = MenuSolver.solve(menuItems);
    attachWidget(menuBar, document.body);

    if (menuBar.isAttached) {
      var disposable = new DisposableDelegate(() => {
        detachWidget(menuBar);
      });
      resolve(disposable);
    } else {
      reject(new Error("Error initialising menu plugin."));
    }
  });                
}

function addToMenuItems(item: ICommandMenuItem): IDisposable {
  menuItems.push(item);
  return new DisposableDelegate(() => {
    var index = indexOfItem(item);
    if (index > -1) {
      menuItems.splice(index, 1);
    }
  });
}

function indexOfItem(item: ICommandMenuItem): number {
  for (var i = 0; i < menuItems.length; ++i) {
    if (compareArrays(menuItems[i].location, item.location)) {
      if (menuItems[i].command === item.command) {
        return i;
      }
    }
  }
  return -1;
}

function compareArrays(first: string[], second: string[]): boolean {
  if (first.length !== second.length) return false;
  for (var i = 0; i < first.length; ++i) {
    if (first[i] !== second[i]) {
      return false;
    }
  }
  return true;
}


var menuItems: ICommandMenuItem[] = [];
var menuBar: MenuBar = null;
