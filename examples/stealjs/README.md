StealJS Example
---------------

In this example, [StealJS](http://stealjs.com/) is used to load two Phosphor
plugins, one of which is a local package (`./bar`), and the other an npm
package (`./node_modules/foo`).

To run the example, run `npm run build:examples` from the top level
`phosphor-plugins` directory, then start an HTTP server from this
directory and browse to `index.html`.  Note that `phosphor-plugins/lib` is
copied to this directory as `phosphor-plugins` so it can be served locally.

The individual plugins can be loaded and unloaded using the provided buttons.
Note that both plugins must be loaded in either order for the content to be
rendered.  Descriptive messages are also printed to the console.

Steal.js will crawl the `node_modules` directory, fetching the `package.json`
files to set the config paths for each npm package.  However, the paths
to `phosphor-plugins/` and `foo/` are configured manually in `index.html`.

Steal.js is beneficial when a majority of the plugins are installed as npm packages, saving a lot of manual configuration.  It also comes bundled with
CSS and LESS plugins.
