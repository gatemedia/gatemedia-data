import { module, test } from 'qunit';
import startApp from '../../helpers/start-app';
import belongsToMeta from 'gatemedia-data/utils/belongs-to-meta';

module('belongs-to-meta');

test('meta object is valid', function (assert) {
  var meta = belongsToMeta('string');

  assert.equal(meta.type, 'string', 'Meta type is `string`');
  assert.ok(meta.isRelation, 'Meta is flagged as relation');
  assert.deepEqual(meta.options, {}, 'Meta options default to none');

  meta = belongsToMeta('string', {
    opt: 'yeah'
  });

  assert.deepEqual(meta.options, {
    opt: 'yeah'
  }, 'Meta options are kept');
});


module('belongs-to-meta codec', {
  setup: function () {
    startApp();
  }
});

test('key is valid', function (assert) {
  var meta = belongsToMeta('string');

  assert.equal(meta.codec.key('stuff'), 'stuff_id');
});

test('embedded key is valid', function (assert) {
  var meta = belongsToMeta('string', {
    embedded: true
  });

  assert.equal(meta.codec.key('stuff'), 'stuff');
});

test('key is camelized', function (assert) {
  var meta = belongsToMeta('string');

  assert.equal(meta.codec.key('myStuff'), 'my_stuff_id');
  assert.equal(meta.codec.key('myStuffs'), 'my_stuff_id'); // not functionaly needed
});

test('embedded key is decamelized', function (assert) {
  var meta = belongsToMeta('string', {
    embedded: true
  });

  assert.equal(meta.codec.key('myStuff'), 'my_stuff');
  assert.equal(meta.codec.key('myStuffs'), 'my_stuff'); // not functionaly needed
});

test('key may be aliased', function (assert) {
  var meta = belongsToMeta('string', {
    key: 'bar'
  });

  assert.equal(meta.codec.key('foo'), 'bar_id');
});
