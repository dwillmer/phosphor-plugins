phosphor-plugins
================

[![Build Status](https://travis-ci.org/phosphorjs/phosphor-plugins.svg)](https://travis-ci.org/phosphorjs/phosphor-plugins?branch=master)
[![Coverage Status](https://coveralls.io/repos/phosphorjs/phosphor-plugins/badge.svg?branch=master&service=github)](https://coveralls.io/github/phosphorjs/phosphor-plugins?branch=master)

A module for building plugin-based applications.

[API Docs](http://phosphorjs.github.io/phosphor-plugins/api/)


Package Install
---------------

**Prerequisites**
- [node](http://nodejs.org/)

```bash
npm install --save phosphor-plugins
```


Source Build
------------

**Prerequisites**
- [git](http://git-scm.com/)
- [node](http://nodejs.org/)

```bash
git clone https://github.com/phosphorjs/phosphor-plugins.git
cd phosphor-plugins
npm install
```

**Rebuild**
```bash
npm run clean
npm run build
```


Run Tests
---------

Follow the source build instructions first.

```bash
# run tests in Firefox
npm test

# run tests in Chrome
npm run test:chrome

# run tests in IE
npm run test:ie
```


Build Docs
----------

Follow the source build instructions first.

```bash
npm run docs
```

Navigate to `docs/index.html`.


Build Examples
--------------

Follow the source build instructions first.

```bash
npm run build:examples
```

Navigate to one of the `examples/` and start a server.


Supported Runtimes
------------------

The runtime versions which are currently *known to work* are listed below.
Earlier versions may also work, but come with no guarantees.

- IE 11+
- Firefox 32+
- Chrome 38+


Plugin Specification
--------------------

Plugins are specified in the top level `package.json` file of a package,
using the `phosphor-plugin` field. A plugin name is the same as the name
of the package which contains the plugin specification.

The `phosphor-plugin` field is an object with the following properties:

- `extensionPoints` - Optional. An array of extension point specifications.
- `extensions` - Optional. An array of extension specifications.

An extension point is specified as an object with the following fields:

- `id` - *Required*. The globally unique id of the extension point.
- `main` - *Optional*. The path to the extension point main module. This
  path is assumed to be relative to the plugin. For example, for a plugin
  named `foo` and an extension point `main` path of `lib/index.js`, the
  `foo/lib/index.js` module is loaded.
- `factory` - *Optional*. The name of a function in the `main` module which
  creates the receiver for the extension point. The function should take
  no arguments and return `void | IReceiver | Promise<IReceiver>`.

An extension is specified as an object with the following fields:

- `id` - *Required*. The globally unique id of the extension.
- `point` - *Required*. The identifier of the target extension point.
- `main` - *Optional*. The path to the extension main module. This path is
  assumed to be relative to the plugin. For example, for a plugin named `bar`
  and an extension `main` path of `lib/index.js`, the `bar/lib/index.js`
  module is loaded.
- `factory` - *Optional*. The name of a function in the `main` module which
  creates the contribution for the extension. The function should take no
  arguments and return `void | IContribution | Promise<IContribution>`.
- `data` - *Optional*. The path to the JSON data file for the extension. Some
  extension points are able to consume data from JSON files, such as menu and
  key binding specifications. This path is relative to the plugin.
- `config` - *Optional*. Extra static configuration data for the extension.
  Some extension points are able to consume static configuration data along
  with the actual extension object.

Paths are loaded using `System.import`, which must be configured to load the
plugin package by name.  See the `examples/` folder for configurations using
`SystemJS` and `StealJS`.


Usage Examples
--------------

**Note:** This module is fully compatible with Node/Babel/ES6/ES5. Simply
omit the type declarations when using a language other than TypeScript.

Register a plugin and load its JSON specification. The plugin's extensions
and extension points are automatically registered. For each extension, the
registry is scanned for a matching extension point. If a match is found,
the extension and extension point are instantiated and paired.

```typescript
import {
  listPlugins, registerPlugin
} from 'phosphor-plugins';

let disposable = registerPlugin('my-plugin');

console.log(listPlugins());  // ['my-plugin']

disposable.dispose();        // unregister and unload the plugin
```

Dynamically register an extension point which is created at runtime:

```typescript
import {
  IExtensionPoint, registerExtensionPoint
} from 'phosphor-plugins';

let point: IExtensionPoint = {

  id: 'my-plugin:my-dynamic-point',

  isDisposed: false,

  dispose: () => {
    point.isDisposed = true;
    console.log('disposed');
  },

  add: extension => {
    console.log('Add extension', extension.id, extension.item);
  },

  remove: id => {
    console.log('Remove extension', id);
  },
};

registerExtensionPoint(point);
```

Dynamically register an extension which is created at runtime:

```typescript
import {
  IExtension, registerExtension
} from 'phosphor-plugins';

let ext: IExtension = {

  id: 'my-other-plugin:my-dynamic-ext',

  point: 'my-plugin:my-dynamic-point',

  item: { value: 42 },

  data: null,

  config: null,

  isDisposed: false,

  dispose: () => {
    ext.isDisposed = true,
    console.log('disposed');
  },
};

registerExtension(extension);
```
