/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

/**
 * An interface describing attributes of a menu item.
 *
 * Menu items can be declared in an external JSON file, with the only
 * required fields being "location" and "command". 
 *
 *  
 *
 */
export interface ICommandMenuItem {
  /**
   * This is a menubar-specific array of strings to denote the location
   * in the menu hierarchy where this command shoul be placed.
   */
  location: string[];

  /**
   * The command that this menu item would like invoked when called.
   */
  command: string;

  /**
   * An (optional) string denoting the shortcut for this specific command.
   * In the case of a command to be shown in a menu, this could be
   * something like 'Ctrl+Shift+T'
   */
  shortcut?: string[];

  /** 
   * Menu constraints are a list of items which denote the position of a
   * given menu item in each 1-D array.
   *
   * We will need to solve the menu order for any item with child items,
   * in order that the constraints can be defined for any level in the
   * hierarchy.
   */
  constraints?: any;

  /**
   * Allows menu items to override the default text from the command
   * to be show shown in the menu.
   */
  title_override?: string;

}
