import { module, test } from 'qunit';
import codec from 'gatemedia-data/utils/codec';

module('Codec - string');

test('encode works', function (assert) {
  assert.equal(codec.string.encode('paf'), 'paf');
});

test('decode works', function (assert) {
  assert.equal(codec.string.decode('paf'), 'paf');
});


module('Codec - number');

test('encode works', function (assert) {
  assert.equal(codec.number.encode(42), 42);
});

test('decode works', function (assert) {
  assert.equal(codec.number.decode('42'), 42);
});


module('Codec - boolean');

test('encode works', function (assert) {
  assert.equal(codec.boolean.encode(true), true);
  assert.equal(codec.boolean.encode(false), false);
  assert.equal(codec.boolean.encode(null), false);
});

test('decode works', function (assert) {
  assert.equal(codec.boolean.decode(true), true);
  assert.equal(codec.boolean.decode(false), false);
  assert.equal(codec.boolean.decode(null), null);
});


module('Codec - array[number]');

test('encode works', function (assert) {
  assert.deepEqual(codec.array.encode([ 36, 42 ], 'number'), [ 36, 42 ]);
});

test('decode works', function (assert) {
  assert.deepEqual(codec.array.decode([ 36, 42 ], 'number'), [ 36, 42 ]);
});


module('Codec - date');

test('encode works', function (assert) {
  assert.equal(codec.date.encode(moment('20141202', 'YYYYMMDD')), '2014-12-02');
  assert.equal(codec.date.encode(null), null);
});

test('decode works', function (assert) {
  assert.equal(codec.date.decode('2014-12-02').format(), moment('20141202', 'YYYYMMDD').format());
  assert.equal(codec.date.decode(null), null);
});


module('Codec - time');

test('encode works', function (assert) {
  assert.equal(codec.time.encode(moment('10:24', 'HH:mm')), '10:24');
  assert.equal(codec.time.encode(null), null);
});

test('decode works', function (assert) {
  assert.equal(codec.time.decode('10:24').format(), moment('10:24', 'HH:mm').format());
  assert.equal(codec.time.decode(null), null);
});


module('Codec - datetime');

test('encode works', function (assert) {
  assert.equal(codec.datetime.encode(moment.utc('20141202T10:24:44', 'YYYYMMDDTHH:mm:ss')), '2014-12-02T10:24:44+00:00');
  assert.equal(codec.datetime.encode(null), null);
});

test('decode works', function (assert) {
  assert.equal(codec.datetime.decode('2014-12-02T10:24:44').format(), moment.utc('20141202T10:24:44', 'YYYYMMDDTHH:mm:ss').format());
  assert.equal(codec.datetime.decode(null), null);
});


module('Codec - json');

test('encode works', function (assert) {
  // deepEqual(codec.json.encode({ a: 42, b: 'hop' }), '{"a":42,"b":"hop"}');
  assert.deepEqual(codec.json.encode('{"a":42,"b":"hop"}'), { a: 42, b: 'hop' });
});

test('decode works', function (assert) {
  // deepEqual(codec.json.decode('{"a":42,"b":"hop"}'), { a: 42, b: 'hop' });
  assert.deepEqual(codec.json.decode({ a: 42, b: 'hop' }), '{"a":42,"b":"hop"}');
});
