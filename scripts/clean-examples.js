var rimraf = require('rimraf');

for (var ex of ['stealjs', 'systemjs']) {
    rimraf('examples/' + ex + '/phosphor-plugins', function(error) {
        if (error) console.error(error);
    });

    rimraf('examples/' + ex + '/node_modules', function(error) {
        if (error) console.error(error);
    });

    rimraf('examples/' + ex + '/bar', function(error) {
        if (error) console.error(error);
    });

}
