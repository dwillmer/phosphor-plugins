var cp = require('glob-copy');
var mkdirp = require('mkdirp');

for (var ex of ['stealjs', 'systemjs']) {

    mkdirp.sync('examples/' + ex + '/phosphor-plugins');

    cp.sync('lib/*.js', 'examples/' + ex + '/phosphor-plugins');

    mkdirp.sync('examples/' + ex + '/bar');

    cp.sync('examples/src/bar/*.*', 'examples/' + ex + '/bar');

    mkdirp.sync('examples/' + ex + '/node_modules/foo');

    cp.sync('examples/src/foo/*.*', 'examples/' + ex + '/node_modules/foo');

    cp.sync('examples/src/*.*', 'examples/' + ex);
}
