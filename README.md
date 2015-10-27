phosphor-plugins
================
A module for building plugin-based applications.

[![Build Status](https://travis-ci.org/phosphorjs/phosphor-plugins.svg)](https://travis-ci.org/phosphorjs/phosphor-plugins?branch=master)
[![Coverage Status](https://coveralls.io/repos/phosphorjs/phosphor-plugins/badge.svg?branch=master&service=github)](https://coveralls.io/github/phosphorjs/phosphor-plugins?branch=master)

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
