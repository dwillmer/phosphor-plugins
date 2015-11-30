/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import expect = require('expect.js');

import {
  IExtension, IExtensionPoint, listExtensions, listExtensionPoints,
  listPlugins, registerExtension, registerExtensionPoint, registerPlugin
} from '../../lib';


/**
 * The id of the example extension point.
 */
let POINT = 'my-plugin:my-dynamic-point';


/**
 * Message log for dynamic extension point handling.
 */
let messages: string[] = [];


/**
 * Example extension point.
 */
let point: IExtensionPoint = {
  id: POINT,
  add: extension => {
    messages.push(`Added ${extension.id}`);
  },
  remove: id => {
    messages.push(`Removed ${id}`);
  },
  isDisposed: false,
  dispose: () => {
    messages.push(`Disposed ${POINT}`);
  }
}


/**
 * A function which computes successive unique ids.
 */
var nextID = (() => { let id = 0; return () => 'ext-' + id++; })();


/**
 * Create an extension to `my-plugin:my-dynamic-point`.
 */
function createExtension(): IExtension {
  let item = { value: 42 };
  let id = `my-other-plugin:my-dynamic-${nextID()}`;
  return {
    id: id,
    point: POINT,
    item: item,
    data: null,
    config: null,
    isDisposed: false,
    dispose: () => {
      messages.push(`Disposed ${id}`);
    }
  }
}


describe('phosphor-plugins', function () {

  describe('registerPlugin()', () => {

    it('should return a disposable that will unload the plugin', () => {
      let disp = registerPlugin('foo');
      expect(disp.isDisposed).to.be(false);
      disp.dispose();
      expect(disp.isDisposed).to.be(true);
      disp = registerPlugin('foo');
      disp.dispose();
    });

    it('should throw an error if the plugin name is already registered', () => {
      let disp = registerPlugin('baz');
      expect(() => { registerPlugin('baz'); }).to.throwError();
      disp.dispose();
    });

  });

  describe('listPlugins()', () => {

    it('should list the names of the currently registered plugins', () => {
      expect(listPlugins()).to.eql([]);
      let fooDisp = registerPlugin('foo');
      let barDisp = registerPlugin('bar');
      expect(listPlugins()).to.eql(['foo', 'bar']);
      fooDisp.dispose();
      barDisp.dispose();
    });

  });

  describe('listExtensions()', () => {

    it('should list the ids of the currently registered extensions', (done) => {
      let fooDisp = registerPlugin('foo');
      let barDisp = registerPlugin('bar');
      expect(listExtensions()).to.eql([]);
      setTimeout(() => {
        expect(listExtensions()).to.eql(['my-bar:bar-ext-0', 'my-bar:bar-ext-1']);
        fooDisp.dispose();
        barDisp.dispose();
        done();
      }, 200);
    });

  });

  describe('listExtensionPoints()', () => {

    it('should list the ids of the currently registered extension points', (done) => {
      let fooDisp = registerPlugin('foo');
      let barDisp = registerPlugin('bar');
      expect(listExtensions()).to.eql([]);
      setTimeout(() => {
        expect(listExtensionPoints()).to.eql(['my-foo:foo-point', 'my-bar:bar-point']);
        fooDisp.dispose();
        barDisp.dispose();
        done();
      }, 200);
    });

  });

  describe('registerExtension()', () => {

    it('should register an extension and connect the matching extension point', (done) => {
      messages = [];
      let pointDisp = registerExtensionPoint(point);
      let ext = createExtension();
      let extDisp = registerExtension(ext);
      setTimeout(() => {
        let message = `Added ${ext.id}`;
        expect(messages.indexOf(message)).to.not.be(-1);
        pointDisp.dispose();
        extDisp.dispose();
        done();
      }, 100);
    });

    it('should throw an error if the extension id is registered', () => {
      messages = [];
      let ext = createExtension();
      let extDisp = registerExtension(ext);
      expect(() => { registerExtension(ext); }).to.throwError();
      extDisp.dispose();
    });

    it('should still trigger a register if the point is added later', (done) => {
      messages = [];
      let ext = createExtension();
      let extDisp = registerExtension(ext);
      let pointDisp = registerExtensionPoint(point);
      setTimeout(() => {
        let message = `Added ${ext.id}`;
        expect(messages.indexOf(message)).to.not.be(-1);
        pointDisp.dispose();
        extDisp.dispose();
        done();
      }, 100);
    });

    it('should dispose of resources when the extension is disposed', (done) => {
      messages = [];
      let pointDisp = registerExtensionPoint(point);
      let ext = createExtension();
      let ext0Disp = registerExtension(ext);
      setTimeout(() => {
        ext0Disp.dispose();
        let message = `Disposed ${ext.id}`;
        expect(messages.indexOf(message)).to.not.be(-1);
        message = `Removed ${ext.id}`;
        expect(messages.indexOf(message)).to.not.be(-1);
        pointDisp.dispose();
        done();
      }, 100);
    });

  });

  describe('registerExtensionPoint()', () => {

    it('should register an extension point and connect the matching extensions', (done) => {
      messages = [];
      let ext = createExtension();
      let extDisp = registerExtension(ext);
      let pointDisp = registerExtensionPoint(point);
      setTimeout(() => {
        let message = `Added ${ext.id}`;
        expect(messages.indexOf(message)).to.not.be(-1);
        pointDisp.dispose();
        extDisp.dispose();
        done();
      }, 100);
    });

    it('should throw an error if the extension point id is registered', () => {
      messages = [];
      let disp = registerExtensionPoint(point);
      expect(() => { registerExtensionPoint(point); }).to.throwError();
      disp.dispose();
    });

    it('should still trigger a register if the extension is added later', (done) => {
      messages = [];
      let pointDisp = registerExtensionPoint(point);
      let ext = createExtension();
      let extDisp = registerExtension(ext);
      setTimeout(() => {
        let message = `Added ${ext.id}`;
        expect(messages.indexOf(message)).to.not.be(-1);
        pointDisp.dispose();
        extDisp.dispose();
        done();
      }, 100);
    });

    it('should accept more than one extension', (done) => {
      messages = [];
      let pointDisp = registerExtensionPoint(point);
      let ext0 = createExtension();
      let ext0Disp = registerExtension(ext0);
      let ext1 = createExtension();
      let ext1Disp = registerExtension(ext1);
      setTimeout(() => {
        let message = `Added ${ext0.id}`;
        expect(messages.indexOf(message)).to.not.be(-1);
        message = `Added ${ext1.id}`;
        expect(messages.indexOf(message)).to.not.be(-1);
        ext0Disp.dispose();
        message = `Removed ${ext0.id}`;
        expect(messages.indexOf(message)).to.not.be(-1);
        ext1Disp.dispose();
        message = `Removed ${ext1.id}`;
        expect(messages.indexOf(message)).to.not.be(-1);
        pointDisp.dispose();
        done();
      }, 100);
    });

    it('should dispose of resources when the point is disposed', (done) => {
      messages = [];
      let pointDisp = registerExtensionPoint(point);
      let ext = createExtension();
      let ext0Disp = registerExtension(ext);
      setTimeout(() => {
        pointDisp.dispose();
        let message = `Disposed ${point.id}`;
        expect(messages.indexOf(message)).to.not.be(-1);
        ext0Disp.dispose();
        message = `Removed ${ext.id}`;
        expect(messages.indexOf(message)).to.be(-1);
        done();
      }, 100);
    });

  });

});

