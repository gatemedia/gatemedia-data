import { module, test } from 'qunit';
import hasManyMeta from 'gatemedia-data/utils/has-many-meta';

module('hasManyMeta');

test('meta object is valid', function (assert) {
  var meta = hasManyMeta('string');

  assert.equal(meta.type, 'string', 'Meta type is `string`');
  assert.ok(meta.isRelation, 'Meta is flagged as relation');
  assert.equal(meta.many, true, 'Meta is flagged as "many" relation');
  assert.deepEqual(meta.options, {}, 'Meta options default to none');

  meta = hasManyMeta('string', {
    opt: 'yeah'
  });

  assert.deepEqual(meta.options, {
    opt: 'yeah'
  }, 'Meta options are kept');
});


module('hasManyMeta codec');

test('key is valid', function (assert) {
  var meta = hasManyMeta('string');

  assert.equal(meta.codec.key('stuff'), 'stuff_ids');
});

test('embedded key is valid', function (assert) {
  var meta = hasManyMeta('string', {
    inline: true
  });

  assert.equal(meta.codec.key('stuffs'), 'stuffs');
  assert.equal(meta.codec.key('stuff'), 'stuffs');
});

test('key is camelized', function (assert) {
  var meta = hasManyMeta('string');

  assert.equal(meta.codec.key('myStuffs'), 'my_stuff_ids');
  assert.equal(meta.codec.key('myStuff'), 'my_stuff_ids');
  assert.equal(meta.codec.key('my-stuffs'), 'my_stuff_ids');
  assert.equal(meta.codec.key('my-stuff'), 'my_stuff_ids');
});

test('embedded key is decamelized', function (assert) {
  var meta = hasManyMeta('string', {
    inline: true
  });

  assert.equal(meta.codec.key('myStuff'), 'my_stuffs');
  assert.equal(meta.codec.key('myStuffs'), 'my_stuffs');
  assert.equal(meta.codec.key('my-stuff'), 'my_stuffs');
  assert.equal(meta.codec.key('my-stuffs'), 'my_stuffs');
});

test('key may be aliased', function (assert) {
  var meta = hasManyMeta('string', {
    key: 'bar'
  });

  assert.equal(meta.codec.key('foo'), 'bar_ids');
});
