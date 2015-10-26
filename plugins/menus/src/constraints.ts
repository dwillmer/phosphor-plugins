
/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

/**
 * The interface an object is required to implement for a Constraint.
 *
 * These are very simple constraint systems which are designed to 
 * produce Before/After relationships in the form of graph edges
 * for input into a solver.
 */
export
interface IConstraint {
  constrain(against: string): string[];
}

/**
 * The Before constraint.
 *
 * When constrained against another value (in this case a string),
 * it returns an array of 2 items with the original value last,
 * thereby declaring a directed edge from new -> original item, forcing
 * the new item to be sorted 'before' the original.
 */
export 
class Before implements IConstraint {
  constructor(private val: string) {}
  constrain(against: string): string[] {
    return [against, this.val];
  }
}

/**
 * The After constraint.
 *
 * When constrained against another value, it returns an array of 2 items 
 * with the original value first, thereby declaring an directed edge from
 * original -> new.
 */ 
export
class After implements IConstraint {
  constructor(private val: string) {}
  constrain(against: string): string[] {
    return [this.val, against];
  }
}
