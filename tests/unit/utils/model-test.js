import { module, test } from 'qunit';
import Model from 'gatemedia-data/utils/model';
import { Meta } from 'gatemedia-data/utils/model';
import ModelChanges from 'gatemedia-data/utils/model-changes';
import attribute from 'gatemedia-data/utils/attribute';
import hasMany from 'gatemedia-data/utils/has-many';
import belongsTo from 'gatemedia-data/utils/belongs-to';

module('Model (static)');

test('eachAttribute (default Model)', function (assert) {
  var EmptyModel = Model.extend(),
      attrNames = [],
      attrMetas = {};

  EmptyModel.eachAttribute(function (name, meta) {
    attrNames.push(name);
    attrMetas[name] = meta;
  });

  assert.deepEqual(attrNames, [ 'id', 'createdAt', 'updatedAt' ], 'Model has at least attributes `id`, `createdAt` & `updatedAt`');
  assert.equal(attrMetas.id.type, 'number', '`id` attribute is a number');
  assert.equal(attrMetas.id.options.serialize, false, '`id` attribute is not serialized');
  assert.equal(attrMetas.createdAt.type, 'datetime', '`id` attribute is a datetime timestamp');
  assert.equal(attrMetas.createdAt.options.serialize, false, '`createdAt` attribute is not serialized');
  assert.equal(attrMetas.updatedAt.type, 'datetime', '`id` attribute is a datetime timestamp');
  assert.equal(attrMetas.updatedAt.options.serialize, false, '`updatedAt` attribute is not serialized');
});

test('eachAttribute', function (assert) {
  var MyModel = Model.extend({
    text: attribute('string'),
    count: attribute('number', { serialize: false }),
    leaves: hasMany('leaf'),
    parent: belongsTo('stuff')
  }),
      attrNames = [],
      attrMetas = {};

  MyModel.eachAttribute(function (name, meta) {
    attrNames.push(name);
    attrMetas[name] = meta;
  });

  assert.deepEqual(attrNames, [
    'text',
    'count',
    'id', 'createdAt', 'updatedAt'
  ], 'Model has all declared attributes + default ones');
  assert.equal(attrMetas.text.type, 'string', '`text` attribute is a string');
  assert.equal(attrMetas.text.options.serialize, undefined, '`text` attribute is serialized');
  assert.equal(attrMetas.count.type, 'number', '`count` attribute is a number');
  assert.equal(attrMetas.count.options.serialize, false, '`count` attribute is not serialized');
});


test('eachRelation (none)', function (assert) {
  var MyModel = Model.extend({
    text: attribute('string'),
    count: attribute('number')
  }),
      relNames = [],
      relMetas = {};

  MyModel.eachRelation(function (name, meta) {
    relNames.push(name);
    relMetas[name] = meta;
  });

  assert.deepEqual(relNames, []);
  assert.deepEqual(relMetas, {});
});

test('eachRelation', function (assert) {
  var MyModel = Model.extend({
    text: attribute('string'),
    count: attribute('number', { serialize: false }),
    leaves: hasMany('leaf'),
    parent: belongsTo('stuff')
  }),
      relNames = [],
      relMetas = {};

  MyModel.eachRelation(function (name, meta) {
    relNames.push(name);
    relMetas[name] = meta;
  });

  assert.deepEqual(relNames, [ 'leaves', 'parent' ]);
  assert.deepEqual(relMetas.leaves.type, 'leaf');
  assert.deepEqual(relMetas.parent.type, 'stuff');
});


test('ownerRelation is null if not defined', function (assert) {
  var MyModel = Model.extend({
    parent: belongsTo('stuff')
  });

  assert.equal(MyModel.ownerRelation(), null);
});

test('ownerRelation is detected if defined', function (assert) {
  var MyModel = Model.extend({
    parent: belongsTo('stuff', { owner: true })
  }),
      owner = MyModel.ownerRelation();

  assert.equal(owner.name, 'parent');
  assert.equal(owner.meta.type, 'stuff');
});


module('Model', {
  setup: function () {
    this.TestModel = Model.extend({
      text: attribute('string'),
      count: attribute('number', { serialize: false }),
      leaves: hasMany('leaf'),
      parent: belongsTo('stuff', { owner: true })
    });

    this.nextTimes = [];
    var nextTimes = this.nextTimes;

    this.TestModel.reopenClass({

      timestampFactory: function () {
        return nextTimes.pop();
      }
    });
  }
});

test('construction', function (assert) {
  var timestamp = 'pif';
  this.nextTimes.push(timestamp);

  var record = this.TestModel.create({
    _data: {
      'text': 'Hello world!',
      'parent_id': 42
    }
  });

  assert.ok(record.get('meta') instanceof Meta, 'Just created record has meta');
  assert.equal(record.get('meta.isNew'), true, 'Just created record is marked isNew');
  assert.equal(record.get('meta.isDirty'), false, 'Just created record is NOT marked isDirty');
  assert.equal(record.get('meta.isDeleted'), false, 'Just created record is NOT marked isDeleted');

  assert.deepEqual(record.get('_original'), {
    'text': 'Hello world!',
    'parent_id': 42
  }, 'Just created record has a copy of the original data');

  assert.ok(record.get('_attributeChanges') instanceof ModelChanges, 'Just created record has no attribute change');
  assert.deepEqual(record.get('_attributeChanges._changed'), []);
  assert.deepEqual(record.get('_attributeChanges._changes'), {});
  assert.ok(record.get('_relationChanges') instanceof ModelChanges, 'Just created record has no relation change');
  assert.deepEqual(record.get('_relationChanges._changed'), []);
  assert.deepEqual(record.get('_relationChanges._changes'), {});

  assert.deepEqual(record.get('_relationsCache'), {}, 'Relations cache is reset');
  assert.equal(record.get('_cacheTimestamp'), timestamp, 'Relations cache has been expired');
});

test('serialization', function (assert) {
  var record = this.TestModel.create({
    _data: {
      'id': 36,
      'text': 'Hello world!',
      'parent_id': 42
    }
  });

  assert.deepEqual(record.toJSON().toString(), {
    'text': 'Hello world!',
    'parent_id': 42
  }.toString(), 'toJSON() doesn\'t include `id`');
});
