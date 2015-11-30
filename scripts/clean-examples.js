var rimraf = require('rimraf');


function logError(err) {
  if (err) console.error(err);
}


for (var ex of ['stealjs', 'systemjs']) {
  rimraf('examples/' + ex + '/phosphor-plugins', logError);

  rimraf('examples/' + ex + '/node_modules', logError);

  rimraf('examples/' + ex + '/bar', logError);

  rimraf('examples/' + ex + '/index.js', logError);

  rimraf('examples/' + ex + '/index.css', logError);
}
