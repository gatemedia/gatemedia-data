import codec from 'gatemedia-data/utils/codec';

module('Codec - string');

test('encode works', function() {
  equal(codec.string.encode('paf'), 'paf');
});

test('decode works', function() {
  equal(codec.string.decode('paf'), 'paf');
});


module('Codec - number');

test('encode works', function() {
  equal(codec.number.encode(42), 42);
});

test('decode works', function() {
  equal(codec.number.decode('42'), 42);
});


module('Codec - boolean');

test('encode works', function() {
  equal(codec.boolean.encode(true), true);
  equal(codec.boolean.encode(false), false);
  equal(codec.boolean.encode(null), false);
});

test('decode works', function() {
  equal(codec.boolean.decode(true), true);
  equal(codec.boolean.decode(false), false);
  equal(codec.boolean.decode(null), null);
});


module('Codec - array[number]');

test('encode works', function() {
  deepEqual(codec.array.encode([ 36, 42 ], 'number'), [ 36, 42 ]);
});

test('decode works', function() {
  deepEqual(codec.array.decode([ 36, 42 ], 'number'), [ 36, 42 ]);
});


module('Codec - date');

test('encode works', function() {
  equal(codec.date.encode(moment('20141202', 'YYYYMMDD')), '2014-12-02');
  equal(codec.date.encode(null), null);
});

test('decode works', function() {
  equal(codec.date.decode('2014-12-02').format(), moment('20141202', 'YYYYMMDD').format());
  equal(codec.date.decode(null), null);
});


module('Codec - time');

test('encode works', function() {
  equal(codec.time.encode(moment('10:24', 'HH:mm')), '10:24');
  equal(codec.time.encode(null), null);
});

test('decode works', function() {
  equal(codec.time.decode('10:24').format(), moment('10:24', 'HH:mm').format());
  equal(codec.time.decode(null), null);
});


module('Codec - datetime');

test('encode works', function() {
  equal(codec.datetime.encode(moment.utc('20141202T10:24:44', 'YYYYMMDDTHH:mm:ss')), '2014-12-02T10:24:44+00:00');
  equal(codec.datetime.encode(null), null);
});

test('decode works', function() {
  equal(codec.datetime.decode('2014-12-02T10:24:44').format(), moment.utc('20141202T10:24:44', 'YYYYMMDDTHH:mm:ss').format());
  equal(codec.datetime.decode(null), null);
});


module('Codec - json');

test('encode works', function() {
  // deepEqual(codec.json.encode({ a: 42, b: 'hop' }), '{"a":42,"b":"hop"}');
  deepEqual(codec.json.encode('{"a":42,"b":"hop"}'), { a: 42, b: 'hop' });
});

test('decode works', function() {
  // deepEqual(codec.json.decode('{"a":42,"b":"hop"}'), { a: 42, b: 'hop' });
  deepEqual(codec.json.decode({ a: 42, b: 'hop' }), '{"a":42,"b":"hop"}');
});
