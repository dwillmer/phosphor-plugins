System.config({
  transpiler: null,
  paths: {
    'es6-module-loader': 'node_modules/es6-module-loader/dist/es6-module-loader.js',
    'systemjs': 'node_modules/systemjs/dist/system.js',
    'system-polyfills': 'node_modules/systemjs/dist/system-polyfills.js',
    'expect.js': 'node_modules/expect.js/index.js',
    'phosphor-disposable': 'node_modules/phosphor-disposable/lib/index.js'
  },
  map: {
    'bar': 'example/bar',
    'foo': 'example/foo'
  },
  packages: {
    '.': {
      defaultExtension: 'js',
      meta: {
        '*.json': {
          loader: 'node_modules/systemjs-plugin-json/json.js'
        }
      }
    },
    'lib': {
      main: 'index.js'
    }
  }
});
