  System.import('phosphor-plugins').then(function(lib) {
    var loadFoo = document.getElementById('load-foo');
    var loadBar = document.getElementById('load-bar');
    var unloadFoo = document.getElementById('unload-foo');
    var unloadBar = document.getElementById('unload-bar');

    var fooDisp = null;
    var barDisp = null;

    loadFoo.onclick = function() {
      if (!fooDisp) {
        console.log('Loading Foo');
        fooDisp = lib.registerPlugin('foo');
      }
    };

    loadBar.onclick = function() {
      if (!barDisp) {
        console.log('Loading Bar');
        barDisp = lib.registerPlugin('bar');
      }
    };

    unloadFoo.onclick = function() {
      if (fooDisp) {
        console.log('Unloading Foo');
        fooDisp.dispose();
        fooDisp = null;
      }
    };

    unloadBar.onclick = function() {
      if (barDisp) {
        console.log('Unloading Bar');
        barDisp.dispose();
        barDisp = null;
      }
    };
  });
