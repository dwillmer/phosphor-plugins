/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';


System.import('phosphor-plugins').then(function(lib) {

  var loadFoo = document.getElementById('load-foo');
  var loadBar = document.getElementById('load-bar');

  var unloadFoo = document.getElementById('unload-foo');
  var unloadBar = document.getElementById('unload-bar');

  var fooDiv = document.getElementById('foo');
  var barDiv = document.getElementById('bar');

  var fooDisposable = null;
  var barDisposable = null;

  loadFoo.onclick = function() {
    if (!fooDisposable) {
      console.log('Loading Foo');
      fooDiv.innerHTML = 'Foo Loaded';
      fooDisposable = lib.registerPlugin('foo');
    }
  };

  loadBar.onclick = function() {
    if (!barDisposable) {
      console.log('Loading Bar');
      barDisposable = lib.registerPlugin('bar');
      barDiv.innerHTML = 'Bar Loaded';
    }
  };

  unloadFoo.onclick = function() {
    if (fooDisposable) {
      console.log('Unloading Foo');
      fooDisposable.dispose();
      fooDisposable = null;
      fooDiv.innerHTML = '';
    }
  };

  unloadBar.onclick = function() {
    if (barDisposable) {
      console.log('Unloading Bar');
      barDisposable.dispose();
      barDisposable = null;
      barDiv.innerHTML = '';
    }
  };
});
