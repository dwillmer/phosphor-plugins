module.exports = function (config) {
  config.set({
    basePath: '..',
    frameworks: ['systemjs', 'mocha'],
    reporters: ['mocha', 'coverage'],
    files: ['test/build/index.js'],
    preprocessors: {
      'lib/*.js': ['coverage'],
    },
    coverageReporter: {
      reporters : [
        { 'type': 'text' },
        { 'type': 'lcov', dir: 'test/coverage' },
        { 'type': 'html', dir: 'test/coverage' }
      ]
    },
    systemjs: {
      configFile: ['test/system.conf.js'],
      serveFiles: [
        'lib/*.*',
        'node_modules/**/*.*',
        'examples/src/**/*.*'
      ],
    },
    port: 9876,
    colors: true,
    singleRun: true,
    logLevel: config.LOG_INFO
  });
};
