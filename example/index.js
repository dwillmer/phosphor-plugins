var lib = require('phosphide/index');


lib.listPlugins().then((plugins) => {
    console.log(plugins);
    lib.loadPlugin('foo').then(() => {
        console.log('foo was loaded');
        lib.loadPlugin('bar').then(() => {
            console.log('bar finished loading');
            lib.unloadPlugin('bar');
            lib.unloadPlugin('foo');
        });
    });
});
