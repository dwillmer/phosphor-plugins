var lib = require('phosphor-plugins/index');


lib.fetchPlugins().then(() => {
    return lib.loadPlugin('foo').then(() => {
        console.log('foo finished loading');
        return lib.loadPlugin('bar').then(() => {
            console.log('bar finished loading');
            lib.unloadPlugin('bar');
            lib.unloadPlugin('foo');
            console.log('all plugins unloaded');
        });
    });
});
