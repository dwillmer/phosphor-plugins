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


Build Example
-------------

Follow the source build instructions first.

```bash
npm run build:example
```

Navigate to `example` and start a server.


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
using the `phosphor-plugins` field.  A plugin name is the same as the
name of the package which contains the plugin specification.

The `phosphor-plugins` field can contain the following properties:

- `extensionPoints` - A list of extension point specificiations.
- `extensions` - A list of extension specifications.

An extension point is specified by the following required fields:

- `main` - The relative path to the extension point main module.
- `id` - The globally unique id of the extension point.
- `factory` - The name of the factory function for the extension point.
The function must take no arguments and return an object with the
`IReceiver` interface.

An extension is specified by the following required fields:

- `main` - The relative path to the extension main module.
- `id` - The globally unique id of the extension.
- `point` - The identifier of the target extension point.
- `factory` - The name of the factory function for the extension.
The function must take no arguments and return an object with the `IContrib` interface.

and the following optional fields:

- `data` - The path to the JSON data file for the extension.
- `config` - Extra static configuration data for the extension.

Plugins are loaded using `System.import`, which must be configured to
load the plugin package by name.  See the `examples/` folder for configuration
using `SystemJS` and `StealJS`.


Usage Examples
--------------

**Note:** This module is fully compatible with Node/Babel/ES6/ES5. Simply
omit the type declarations when using a language other than TypeScript.

Register a plugin and load its JSON specification.

```typescript
let disposable = registerPlugin('my-plugin');
console.log(listPlugins());  // 'my-plugin'
disposable.dispose();  // disposes of the plugin
```

Dynamically register an extension point which is created at runtime.

```typescript
export
interface IMyDynamicPoint {
  value: number;
}

let point = {
  id: 'my-plugin:my-dynamic-point',
  add: extension => {
    console.log('Added extension', extension.item.value);
  },
  remove: id => {
    console.log('Removed extension', id);
  },
  isDisposed: false,
  dispose: () => {
    console.log('disposed');
  }
}
registerExtensionPoint(point);
```

Dynamically register an extension which is created at runtime.

```typescript
import {
  IMyDynamicPoint
} from 'my-plugin';

let item: IMyDynamicPoint = { value: 42 };
let extension = {
  id: 'my-other-plugin:my-dynamic-ext0',
  point: 'my-plugin:my-dynamic-point',
  item: item,
  data: null,
  config: null,
  isDisposed: false,
  dispose: () => {
    console.log('disposed');
  }
}
registerExtension(extension);
```
