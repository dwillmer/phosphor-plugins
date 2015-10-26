
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
  MenuBar
} from 'phosphor-menus';

import {
  ISignal
} from 'phosphor-signaling';


/**
 * MenuManager stores the existing registered menu names, and presents
 * information about this menu system to other parts of the application,
 * such as the UI generation code.
 *
 * Note: This is *not* a singleton, and should not be treated as such.
 * We should have, and expect to have, multiple menu managers around
 * the application, for example there may be a manager per context menu.
 */
export
interface IMenuManager {
  menuUpdated: ISignal<IMenuManager, MenuBar>;

  /**
   * Registers a menu item with the manager, returns a boolean to
   * confirm whether it registered correctly.
   *
   * A false could indicate that a menu item at that location is
   * already registered - if the implementer would like to just over-ride
   * existing values, then they can always return true;
   * 
   * This may require a more nuanced approach to dealing with errors.
   * TODO - should this return IDiposable?
   */
  add(items: ICommandMenuItem[]): void;

  /** 
   * Returns a list of objects implementing IMenuItem that represents all
   * currently registered menu items.
   *
   * #### Notes
   *
   * There is no guarantee that the objects returned here are the same
   * as the ones registered using registerMenuItem - that's implementation-
   * specific, and should *not* be relied upon. 
   */
  allMenuItems(): ICommandMenuItem[];
}
