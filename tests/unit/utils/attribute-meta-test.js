import { module, test } from 'qunit';
import attributeMeta from 'gatemedia-data/utils/attribute-meta';

module('attributeMeta');

test('meta object is valid', function (assert) {
  var meta = attributeMeta('string');

  assert.equal(meta.type, 'string', 'Meta type is `string`');
  assert.ok(meta.isAttribute, 'Meta is flagged as attribute');
  assert.deepEqual(meta.options, {}, 'Meta options default to none');

  meta = attributeMeta('string', {
    opt: 'yeah'
  });

  assert.deepEqual(meta.options, {
    opt: 'yeah'
  }, 'Meta options are kept');
});


module('attributeMeta codec');

test('key is valid', function (assert) {
  var meta = attributeMeta('string');

  assert.equal(meta.codec.key('stuff'), 'stuff');
});

test('key is decamelized', function (assert) {
  var meta = attributeMeta('string');

  assert.equal(meta.codec.key('myStuff'), 'my_stuff');
});

test('key may be aliased', function (assert) {
  var meta = attributeMeta('string', {
    key: 'bar'
  });

  assert.equal(meta.codec.key('foo'), 'bar');
});
