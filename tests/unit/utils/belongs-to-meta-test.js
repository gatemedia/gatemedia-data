import belongsToMeta from 'gatemedia-data/utils/belongs-to-meta';

module('belongsToMeta');

test('meta object is valid', function() {
  var meta = belongsToMeta('string');

  equal(meta.type, 'string', 'Meta type is `string`');
  ok(meta.isRelation, 'Meta is flagged as relation');
  deepEqual(meta.options, {}, 'Meta options default to none');

  meta = belongsToMeta('string', {
    opt: 'yeah'
  });

  deepEqual(meta.options, {
    opt: 'yeah'
  }, 'Meta options are kept');
});


module('belongsToMeta codec');

test('key is valid', function() {
  var meta = belongsToMeta('string');

  equal(meta.codec.key('stuff'), 'stuff_id');
});

test('embedded key is valid', function() {
  var meta = belongsToMeta('string', {
    embedded: true
  });

  equal(meta.codec.key('stuff'), 'stuff');
});

test('key is camelized', function() {
  var meta = belongsToMeta('string');

  equal(meta.codec.key('myStuff'), 'my_stuff_id');
  equal(meta.codec.key('myStuffs'), 'my_stuff_id'); // not functionaly needed
});

test('embedded key is decamelized', function() {
  var meta = belongsToMeta('string', {
    embedded: true
  });

  equal(meta.codec.key('myStuff'), 'my_stuff');
  equal(meta.codec.key('myStuffs'), 'my_stuff'); // not functionaly needed
});

test('key may be aliased', function() {
  var meta = belongsToMeta('string', {
    key: 'bar'
  });

  equal(meta.codec.key('foo'), 'bar_id');
});
