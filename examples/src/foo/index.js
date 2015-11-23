/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';


/**
 * Create the receiver for the `my-foo:foo-point` extension point.
 *
 * The returned object must implement the `IReceiver` interface. If an
 * asynchronous task must be run before the receiver can be created, a
 * `Promise` which resolves to a receiver can be returned.
 */
function createFooReceiver() {
  return {
    add: function(extension) {
      console.log('Add to `my-foo:foo-point`:', extension);
      var node = document.getElementById('foo');
      node.appendChild(extension.item);
    },
    remove: function(id) {
      console.log('Remove from `my-foo:foo-point`:', id);
    },
    dispose: function() {
      console.log('Dispose `my-foo:foo-point`');
      var node = document.getElementById('foo');
      while (node.firstChild) {
        node.removeChild(node.firstChild);
      }
    },
  };
}

exports.createFooReceiver = createFooReceiver;
