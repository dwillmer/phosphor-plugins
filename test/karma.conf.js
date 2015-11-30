module.exports = function (config) {
  config.set({
    basePath: '..',
    frameworks: ['systemjs', 'mocha'],
    reporters: ['mocha'],
    files: ['test/build/index.js'],
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
