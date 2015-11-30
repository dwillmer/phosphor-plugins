  System.import('phosphor-plugins').then(function(lib) {
    var loadFoo = document.getElementById('load-foo');
    var loadBar = document.getElementById('load-bar');
    var unloadFoo = document.getElementById('unload-foo');
    var unloadBar = document.getElementById('unload-bar');
    var fooDiv = document.getElementById('foo');
    var barDiv = document.getElementById('bar');

    var fooDisp = null;
    var barDisp = null;

    loadFoo.onclick = function() {
      if (!fooDisp) {
        console.log('Loading Foo');
        fooDiv.innerHTML = 'Foo Loaded';
        fooDisp = lib.registerPlugin('foo');
      }
    };

    loadBar.onclick = function() {
      if (!barDisp) {
        console.log('Loading Bar');
        barDisp = lib.registerPlugin('bar');
        barDiv.innerHTML = 'Bar Loaded';
      }
    };

    unloadFoo.onclick = function() {
      if (fooDisp) {
        console.log('Unloading Foo');
        fooDisp.dispose();
        fooDisp = null;
        fooDiv.innerHTML = '';
      }
    };

    unloadBar.onclick = function() {
      if (barDisp) {
        console.log('Unloading Bar');
        barDisp.dispose();
        barDisp = null;
        barDiv.innerHTML = '';
      }
    };
  });
