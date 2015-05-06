import Ember from 'ember';
import { module, test } from 'qunit';
import embeddedMeta from 'gatemedia-data/utils/embedded-meta';

module('embedded-meta');

test('meta object is valid', function (assert) {
  var meta = embeddedMeta('stuff');

  assert.equal(meta.type, 'stuff', 'Meta type is `stuff`');
  assert.ok(meta.isAttribute, 'Meta is flagged as attribute');
  assert.ok(meta.embedded, 'Meta is flagged as embedded');
  assert.ok(!meta.isArray, 'Meta is flagged as not array');
  assert.deepEqual(meta.options, {}, 'Meta options default to none');

  meta = embeddedMeta('stuff', {
    opt: 'yeah'
  });

  assert.deepEqual(meta.options, {
    opt: 'yeah'
  }, 'Meta options are kept');
});


test('meta object is valid for array', function (assert) {
  var meta = embeddedMeta('array:stuff');

  assert.equal(meta.type, 'stuff', 'Meta type is `stuff`');
  assert.ok(meta.isAttribute, 'Meta is flagged as attribute');
  assert.ok(meta.embedded, 'Meta is flagged as embedded');
  assert.ok(meta.isArray, 'Meta is flagged as array');
  assert.deepEqual(meta.options, {}, 'Meta options default to none');

  meta = embeddedMeta('stuff', {
    opt: 'yeah'
  });

  assert.deepEqual(meta.options, {
    opt: 'yeah'
  }, 'Meta options are kept');
});


test('key is valid', function (assert) {
  var meta = embeddedMeta('stuff');

  assert.equal(meta.codec.key('stuff'), 'stuff');
  assert.equal(meta.codec.key('someStuff'), 'some_stuff');
  assert.equal(meta.codec.key('some-stuff'), 'some_stuff');
});


var Stuff = Ember.Object.extend({
  hop: null,

  toJSON: function () {
    return {
      'hop': this.get('hop')
    };
  }
});

test('encoding works', function (assert) {
  var meta = embeddedMeta('stuff'),
      instance = Ember.Object.create({
    myStuff: Stuff.create({ hop: 42 })
  });

  assert.deepEqual(meta.codec.encode(instance, 'myStuff'), {
    hop: 42
  }, 'Serialized instance as expected');
});


test('array encoding works', function (assert) {
  var meta = embeddedMeta('array:stuff'),
      instance = Ember.Object.create({
    myStuffs: [
      Stuff.create({ hop: 42 }),
      Stuff.create({ hop: 36 }),
      Stuff.create({ hop: 81 })
    ]
  });

  assert.deepEqual(meta.codec.encode(instance, 'myStuffs'), [
    { hop: 42 },
    { hop: 36 },
    { hop: 81 }
  ], 'Serialized instance as expected');
});
