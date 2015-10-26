/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  Before, After
} from './constraints';

import {
  ICommandMenuItem
} from './menuiteminterface';

import {
  Menu, MenuBar, MenuItem
} from 'phosphor-menus';

import {
  TopSort
} from 'phosphor-topsort';


/**
 * Flattens a shallow-nested array-of-arrays into a single array
 * with all elements.
 *
 * #### Examples
 * ```typescript
 * var data = [[1],[2],[3,4]];
 * shallowFlatten(data); // [1,2,3,4]
 * ```
 * or with strings:
 * ```typescript
 * var data = [['a'],['b'],['c','d']];
 * shallowFlatten(data); // ['a','b','c','d']
 * ```
 *
 * #### Notes
 *
 * This is called `shallowFlatten` because it will not flatten arrays
 * to arbitrary levels of nesting, this only works 2 levels deep. This 
 * is sufficient for topsort as we're only dealing with edge lists.
 */
export 
function shallowFlatten(nested: any): any {
  return [].concat.apply([], nested);
}

/**
 * When combined with filter, returns the unique items in a flattened array.
 *
 * #### Examples
 * ```typescript
 * var data = [1,2,3,1];
 * testData.filter(unique); // [1,2,3]
 * ```
 */
export
function unique<T>(val: T, i: number, self: any): boolean {
  return self.indexOf(val) === i;
}

/**
 * Takes an item and returns the location with the item attached as 'menuItem'
 */
var itemTranspose = (item: any) => {
  var ret = item.location;
  ret.menuItem = item;
  return ret;
}

/**
 * Takes a transposed menu item and builds a phosphor MenuItem object for
 * direct use in the menus.
 */
var buildItem = function(item: any) {
  return new MenuItem({
    text: item[item.length-1],
    shortcut: item.menuItem.shortcut
  });
}

/**
 * Builds a phosphor submenu (an array of menu items inside a Menu object)
 * from the items passed in and the text string for this MenuItem.
 */
var buildSubmenu = function(items: MenuItem[], text: string): MenuItem {
  var menuObj = new Menu();
  menuObj.items = items;
  return new MenuItem({text: text, submenu: menuObj});
}

/**
 * Returns true if the arrays are equal, false otherwise.
 */
var arrayEquality = function(a: any[], b: any[]): boolean {
  return (a.length === b.length) && a.every((x: any, y: any): boolean => {
    return x === b[y];
  });
}

/**
 * Returns the all the items at a given level in the tree.
 *
 * #### Notes
 * This currently iterates over the items array twice; once for the map
 * and once for the filter. It would be nice to reduce this to a single
 * iteration, if we can do it without obscuring what's really going on.
 */
var getItemsAtLevel = function(items: ICommandMenuItem[], level: string[]): string[][] {
  var num = level.length;
  return items
    .map(function(val){
      var vloc = val.location;
      if((vloc.length > num) && arrayEquality(vloc.slice(0,num), level)) {
        (<any>vloc).menuItem = val;
        return <string[]>vloc;
      }
    })
    .filter((val) => val !== undefined);
}


/**
 * Tests whether the initial values in the given item match the ones in the 
 * prefix argument. Essentially 'is this menu item in this part of the tree?'.
 */
var matchesPrefix = function(prefix: string[], item: string[]): boolean {
  return item.length >= prefix.length && arrayEquality(item.slice(0, prefix.length), prefix);
}

/**
 * Returns items that are in 'first' but not 'second' array. This is not symmetric.
 */
var difference = function(first: string[], second: string[]): string[] {
  return first.filter((i) => second.indexOf(i) < 0);
}

/**
 * Returns the constraints for all items at a given level in the 
 * tree. 
 *
 * Eg. if the constraints for ['File','New','Document'] include
 * 'file': before('edit'), 'new': before('open'), then
 * the constraints at level 0 will be ['File','Edit'], and the
 * constraints at level 1 will be ['New', 'Open']
 */
var getConstraintsAtLevel = function(item: string[], level: number): [string, string][] {
  var constraints: [string, string][] = [];
  var menuItem = (<any>(item)).menuItem;
  var levelText = menuItem.location[level];
  if (menuItem.constraints === undefined) { return constraints; }
  var cons = menuItem.constraints[levelText];
  if (cons) {
    for (var c = 0; c < cons.length; ++c) {
      constraints.push(cons[c].constrain(levelText));
    }
  }
  return constraints;
}

/**
 * Returns the constraints as an unordered array of directed edges for the objects
 * in the level of the tree at 'prefix', for every item in 'items'.
 */
var getConstraints = function(items: string[][], prefix: string[]): [string, string][] {
  var constraints: [string,string][] = [];
  for(var i=0; i<items.length; ++i) {
    if(matchesPrefix(prefix, items[i])) {
      var allCons = getConstraintsAtLevel(items[i], prefix.length);
      allCons.map((x) => { constraints.push(x); })
    }
  }

  // The constraints array is now the list of edges defined by the constraints
  // on this menu system. However it does not take care of items which are in
  // the menu system, but are unconstrained.
  // In order to have a reliable, consistent mechanism for forming menus, we
  // therefore find all the items which have no constraints defined, and use
  // their position in the menu declaration to define their constraints.
  // This allows the user to only define constraints for the first item, and 
  // the rest will automatically fall into place, if defined in the required
  // order.

  // var flattened = shallowFlatten(constraints);
  // var allConstrained = flattened.filter(unique);
  // var unconstrained = difference(allItems, allConstrained);
  // unconstrained.sort();
  // for (var i=0; i<unconstrained.length - 1; i++) {
  //   constraints.push([unconstrained[i], unconstrained[i + 1]]);
  // }

  // TODO : do this properly - should be based on position defined.
  return constraints;
}

/**
 * Takes a list of IMenuItems and a prefix and returns a fully formed menu for
 * all objects below that tree level.
 */
export 
function partialSolve(items: ICommandMenuItem[], prefix: string[]): MenuItem[] {
  var menuItems: any[] = [];
  var levelItems: string[][] = getItemsAtLevel(items, prefix);

  // TODO : don't need to sort at every level, can just sort once at the top,
  // or require the items to be sorted before calling partialSolve.
  levelItems.sort();

  var startIdx = 0;
  var endIdx = 0;
  var preLen = prefix.length;

  while (endIdx < levelItems.length) {
    var currentVal = levelItems[startIdx];

    // This is the real centre of the menu solver - 
    // if the prefix passed in is one less than the location length, then this
    // is a leaf node, so we build a menu item and push it onto the array (order
    // solving is done later). If the location length is longer than (prefix
    // length +1), then this is an intermediate node which has its own submenu.
    // In the latter case we recursively call partialSolve with a new prefix
    // containing the intermediate level.
    // That partialSolve clearly returns a built menu with the items at theat level,
    // so we just append that to our current array.
    if (levelItems[endIdx].length === preLen+1) {
      menuItems.push(buildItem(levelItems[endIdx]));
      endIdx++;
      startIdx = endIdx;
    } else {
      // iterate over all the items at this level in the tree
      // take prefix length, use that as index into levelItems[endIdx]
      var match = levelItems[endIdx][preLen];
      while (levelItems[endIdx] && levelItems[endIdx][preLen] === match) {
        endIdx++;
      }
      var subItems = levelItems.slice(startIdx, endIdx).map((val) => {
        return (<any>val).menuItem;
      });

      var submenu = partialSolve(subItems, currentVal.slice(0,preLen+1));
      var menuObj = buildSubmenu(submenu, currentVal[preLen]);
      menuItems.push(menuObj);
      startIdx = endIdx;
      endIdx++;
    }
  }

  // At this point we have a fully formed menu for the 'prefix' level in the tree.
  // All we do now is sort based on the constraints given for all menu items
  // *at this level or below*.
  var order = TopSort.sort(getConstraints(levelItems, prefix));
  menuItems.sort((a:any, b:any): number => {
    return order.indexOf(a.text) - order.indexOf(b.text);
  });
  return menuItems;
} 

