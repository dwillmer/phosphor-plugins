SystemJS Example
---------------

In this example, [SystemJS](https://github.com/systemjs/systemjs) is used to
load two Phosphor plugins, one of which is a local package ('./bar'), and the other an npm package (`./node_modules/foo`).

To run the example, run `npm run build:examples` from the top level
`phosphor-plugins` directory, then start an HTTP server from this
directory and browse to `index.html`.  Note that `phosphor-plugins/lib` is
copied to this directory as `phosphor-plugins` so it can be served locally.

The individual plugins can be loaded and unloaded using the provided buttons,
and descriptive messages are printed to the console.

Note that the paths to all packages must be configured
(in this case in `index.html).  The top level package is configured to
append `js` on `System.import` via the `defaultExtension` setting.
Desired plugins can also be added to the top level package, in this case the
`systemjs-plugin-json` plugin is used to load modules that end in `.json`.
