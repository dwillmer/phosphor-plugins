var cp = require('glob-copy');
cp.sync('lib/*.js', 'examples/stealjs/phosphor-plugins');
cp.sync('lib/*.js', 'examples/systemjs/phosphor-plugins');
