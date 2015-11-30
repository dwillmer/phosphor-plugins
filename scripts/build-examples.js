var proc = require('child_process');
var fs = require('fs-extra');


for (var ex of ['stealjs', 'systemjs']) {

  fs.copySync('lib', 'examples/' + ex + '/phosphor-plugins');

  fs.copySync('examples/src/bar', 'examples/' + ex + '/bar');

  fs.copySync('examples/src/foo', 'examples/' + ex + '/node_modules/foo');

  fs.copySync('examples/src/index.css', 'examples/' + ex  + '/index.css');

  fs.copySync('examples/src/index.js', 'examples/' + ex  + '/index.js');

  proc.execSync('cd examples/' + ex + ' && npm install');
}
