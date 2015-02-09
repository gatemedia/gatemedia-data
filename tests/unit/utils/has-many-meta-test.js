import hasManyMeta from 'gatemedia-data/utils/has-many-meta';

module('hasManyMeta');

test('meta object is valid', function() {
  var meta = hasManyMeta('string');

  equal(meta.type, 'string', 'Meta type is `string`');
  ok(meta.isRelation, 'Meta is flagged as relation');
  equal(meta.many, true, 'Meta is flagged as "many" relation');
  deepEqual(meta.options, {}, 'Meta options default to none');

  meta = hasManyMeta('string', {
    opt: 'yeah'
  });

  deepEqual(meta.options, {
    opt: 'yeah'
  }, 'Meta options are kept');
});


module('hasManyMeta codec');

test('key is valid', function() {
  var meta = hasManyMeta('string');

  equal(meta.codec.key('stuff'), 'stuff_ids');
});

test('embedded key is valid', function() {
  var meta = hasManyMeta('string', {
    inline: true
  });

  equal(meta.codec.key('stuffs'), 'stuffs');
  equal(meta.codec.key('stuff'), 'stuffs');
});

test('key is camelized', function() {
  var meta = hasManyMeta('string');

  equal(meta.codec.key('myStuffs'), 'my_stuff_ids');
  equal(meta.codec.key('myStuff'), 'my_stuff_ids');
  equal(meta.codec.key('my-stuffs'), 'my_stuff_ids');
  equal(meta.codec.key('my-stuff'), 'my_stuff_ids');
});

test('embedded key is decamelized', function() {
  var meta = hasManyMeta('string', {
    inline: true
  });

  equal(meta.codec.key('myStuff'), 'my_stuffs');
  equal(meta.codec.key('myStuffs'), 'my_stuffs');
  equal(meta.codec.key('my-stuff'), 'my_stuffs');
  equal(meta.codec.key('my-stuffs'), 'my_stuffs');
});

test('key may be aliased', function() {
  var meta = hasManyMeta('string', {
    key: 'bar'
  });

  equal(meta.codec.key('foo'), 'bar_ids');
});
