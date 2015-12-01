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
  var extensionMap = {};
  return {
    isDisposed: false,

    dispose: function() {
      this.isDisposed = true;
      console.log('Dispose `my-foo:foo-point`');
      var content = document.getElementById('foo-content');
      content.textContent = '';
      extensionMap = null;
    },

    add: function(extension) {
      console.log('Add to `my-foo:foo-point`:', extension);
      extensionMap[extension.id] = extension;
      var content = document.getElementById('foo-content');
      content.appendChild(extension.item);
    },

    remove: function(id) {
      console.log('Remove from `my-foo:foo-point`:', id);
      var extension = extensionMap[id];
      delete extensionMap[id];
      var content = document.getElementById('foo-content');
      content.removeChild(extension.item);
    },
  };
}

exports.createFooReceiver = createFooReceiver;
