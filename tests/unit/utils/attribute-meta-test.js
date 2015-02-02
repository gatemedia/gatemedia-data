import attributeMeta from 'gatemedia-data/utils/attribute-meta';

module('attributeMeta');

test('meta object is valid', function() {
  var meta = attributeMeta('string');

  equal(meta.type, 'string', 'Meta type is `string`');
  ok(meta.isAttribute, 'Meta is flagged as attribute');
  deepEqual(meta.options, {}, 'Meta options default to none');

  meta = attributeMeta('string', {
    opt: 'yeah'
  });

  deepEqual(meta.options, {
    opt: 'yeah'
  }, 'Meta options are kept');
});


module('attributeMeta codec');

test('key is valid', function() {
  var meta = attributeMeta('string');

  equal(meta.codec.key('stuff'), 'stuff');
});

test('key is decamelized', function() {
  var meta = attributeMeta('string');

  equal(meta.codec.key('myStuff'), 'my_stuff');
});

test('key may be aliased', function() {
  var meta = attributeMeta('string', {
    key: 'bar'
  });

  equal(meta.codec.key('foo'), 'bar');
});
