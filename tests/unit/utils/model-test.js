import Model from 'gatemedia-data/utils/model';
import { Meta } from 'gatemedia-data/utils/model';
import ModelChanges from 'gatemedia-data/utils/model-changes';
import attribute from 'gatemedia-data/utils/attribute';
import hasMany from 'gatemedia-data/utils/has-many';
import belongsTo from 'gatemedia-data/utils/belongs-to';

module('Model (static)');

test('eachAttribute (default Model)', function () {
  var EmptyModel = Model.extend(),
      attrNames = [],
      attrMetas = {};

  EmptyModel.eachAttribute(function (name, meta) {
    attrNames.push(name);
    attrMetas[name] = meta;
  });

  deepEqual(attrNames, [ 'id', 'createdAt', 'updatedAt' ], 'Model has at least attributes `id`, `createdAt` & `updatedAt`');
  equal(attrMetas.id.type, 'number', '`id` attribute is a number');
  equal(attrMetas.id.options.serialize, false, '`id` attribute is not serialized');
  equal(attrMetas.createdAt.type, 'datetime', '`id` attribute is a datetime timestamp');
  equal(attrMetas.createdAt.options.serialize, false, '`createdAt` attribute is not serialized');
  equal(attrMetas.updatedAt.type, 'datetime', '`id` attribute is a datetime timestamp');
  equal(attrMetas.updatedAt.options.serialize, false, '`updatedAt` attribute is not serialized');
});

test('eachAttribute', function () {
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

  deepEqual(attrNames, [
    'text',
    'count',
    'id', 'createdAt', 'updatedAt'
  ], 'Model has all declared attributes + default ones');
  equal(attrMetas.text.type, 'string', '`text` attribute is a string');
  equal(attrMetas.text.options.serialize, undefined, '`text` attribute is serialized');
  equal(attrMetas.count.type, 'number', '`count` attribute is a number');
  equal(attrMetas.count.options.serialize, false, '`count` attribute is not serialized');
});


test('eachRelation (none)', function () {
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

  deepEqual(relNames, []);
  deepEqual(relMetas, {});
});

test('eachRelation', function () {
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

  deepEqual(relNames, [ 'leaves', 'parent' ]);
  deepEqual(relMetas.leaves.type, 'leaf');
  deepEqual(relMetas.parent.type, 'stuff');
});


test('ownerRelation is null if not defined', function () {
  var MyModel = Model.extend({
    parent: belongsTo('stuff')
  });

  equal(MyModel.ownerRelation(), null);
});

test('ownerRelation is detected if defined', function () {
  var MyModel = Model.extend({
    parent: belongsTo('stuff', { owner: true })
  }),
      owner = MyModel.ownerRelation();

  equal(owner.name, 'parent');
  equal(owner.meta.type, 'stuff');
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

test('construction', function () {
  var timestamp = 'pif';
  this.nextTimes.push(timestamp);

  var record = this.TestModel.create({
    _data: {
      'text': 'Hello world!',
      'parent_id': 42
    }
  });

  ok(record.get('meta') instanceof Meta, 'Just created record has meta');
  equal(record.get('meta.isNew'), true, 'Just created record is marked isNew');
  equal(record.get('meta.isDirty'), false, 'Just created record is NOT marked isDirty');
  equal(record.get('meta.isDeleted'), false, 'Just created record is NOT marked isDeleted');

  deepEqual(record.get('_original'), {
    'text': 'Hello world!',
    'parent_id': 42
  }, 'Just created record has a copy of the original data');

  ok(record.get('_attributeChanges') instanceof ModelChanges, 'Just created record has no attribute change');
  deepEqual(record.get('_attributeChanges._changed'), []);
  deepEqual(record.get('_attributeChanges._changes'), {});
  ok(record.get('_relationChanges') instanceof ModelChanges, 'Just created record has no relation change');
  deepEqual(record.get('_relationChanges._changed'), []);
  deepEqual(record.get('_relationChanges._changes'), {});

  deepEqual(record.get('_relationsCache'), {}, 'Relations cache is reset');
  equal(record.get('_cacheTimestamp'), timestamp, 'Relations cache has been expired');
});

test('serialization', function () {
  var record = this.TestModel.create({
    _data: {
      'id': 36,
      'text': 'Hello world!',
      'parent_id': 42
    }
  });

  deepEqual(record.toJSON().toString(), {
    'text': 'Hello world!',
    'parent_id': 42
  }.toString(), 'toJSON() doesn\'t include `id`');
});
