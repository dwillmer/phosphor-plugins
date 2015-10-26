/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  IExtension
} from 'phosphide';

import {
  IDisposable, DisposableDelegate
} from 'phosphor-disposable';

import {
  DockPanel
} from 'phosphor-dockpanel';

import {
  Tab
} from 'phosphor-tabs';

import {
  Widget, attachWidget
} from 'phosphor-widget';

import './index.css';


function createContent(title: string): Widget {
  var widget = new Widget();
  var tab = new Tab(title);
  tab.closable = true;
  DockPanel.setTab(widget, tab);
  return widget;
}


/**
 * The interface that must be adhered to in order to interact
 * with the DockAreaExtensionPoint.
 */
export 
interface IItems {
  items: Widget[]; // Widget?
  tabs: Tab[];
}


export
function receiveItems(extension: IExtension<IItems>): IDisposable {
  if (extension.object && extension.object.hasOwnProperty('items')) {
    var items = extension.object.items;
    var tabs = extension.object.tabs;
    for (var i = 0; i < items.length; ++i) {
      DockPanel.setTab(items[i], tabs[i]);
      dockarea.addWidget(items[i]);
    }
  }
  return void 0;
}


export
function initialize(): IDisposable {
  attachWidget(dockarea, document.body);
  window.onresize = () => dockarea.update();
  return void 0;
}


var dockarea = new DockPanel();
dockarea.id = 'main';
var initialView = createContent('Initial Tab');
dockarea.addWidget(initialView);

