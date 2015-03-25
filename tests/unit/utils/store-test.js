import Ember from 'ember';
import { module, test } from 'qunit';
import Store from 'gatemedia-data/utils/store';

module('Store basics');

test('modelFor retrieves model from key', function (assert) {
  var store = Store.create({
    container: Ember.Object.create({
      lookupFactory: function (key) {
        return '%@:factory'.fmt(key);
      }
    })
  });

  assert.equal(store.modelFor('stuff'), 'model:stuff:factory', 'modelFor return simply named model factory');
  assert.equal(store.modelFor('test-stuff'), 'model:test-stuff:factory', 'modelFor return complex named model factory');
});


module('Store', {
  
  beforeEach: function () {
    var Model = Ember.Object.extend({
      meta: null,

      init: function () {
        this._super();
        this.set('meta', Ember.Object.create({
            isNew: 'untouched',
            isDirty: 'untouched',
            isDeleted: 'untouched'
          })
        );
      },

      cacheReset: 0,
      resetCaches: function () {
        this.incrementProperty('cacheReset');
      },

      dirty: function () {
        this.set('meta.isDirty', true);
      }
    });
    Model.reopenClass({

      eachRelation: function (callback, binding) {
        this.relations.forEach(function (name) {
          callback.call(binding || this, name, {
            type: name.singularize(),
            options: {}
          });
        }, this);
      }
    });

    this.store = Store.create({
      container: Ember.Object.create({
        lookupFactory: function (key) {
          switch (key) {
          case 'model:user':
            return Model.extend({ '__modelFor__': key }).reopenClass({ relations: [ 'posts' ] });
          case 'model:post':
            return Model.extend({ '__modelFor__': key }).reopenClass({ relations: [ 'comments' ]  });
          case 'model:comment':
            return Model.extend({ '__modelFor__': key }).reopenClass({ relations: [] });
          default:
            return Model.extend({ '__modelFor__': key }).reopenClass({ relations: [] });
          }
        }
      })
    });
  }
});

test('createRecord expects data with ID', function (assert) {
  var self = this;
  assert.throws(function () {
    self.store.createRecord('stuff');
  },
  new Error('Assertion Failed: Missing record id (stuff)'),
  'Missing data ID fails');

  assert.throws(function () {
    self.store.createRecord('stuff', { stuff: 'Hi' });
  },
  new Error('Assertion Failed: Missing record id (stuff)'),
  'Missing data ID fails');
});

test('createRecord works & cache created instance if not embedded', function (assert) {
  var record = this.store.createRecord('stuff', {
    id: 42,
    stuff: 'Hi'
  });
  assert.equal(record.get('__modelFor__'), 'model:stuff', 'Record belongs to expected model');
  assert.equal(record.get('meta.isNew'), 'untouched', 'Record has meta.isNew untouched');
  assert.equal(record.get('meta.isDirty'), 'untouched', 'Record has meta.isDirty untouched');
  assert.equal(record.get('meta.isDeleted'), 'untouched', 'Record has meta.isDeleted untouched');
  assert.deepEqual(record.get('_data'), {
    id: 42,
    stuff: 'Hi'
  }, 'Record attributes are stored raw');
  assert.deepEqual(Ember.keys(this.store._cache.stuff), ['42'], 'Record is cached');

  this.store.createRecord('stuff', {
    id: 36,
    stuff: 'Hi world'
  }, {
    _embeddedContainer: 'something'
  });
  assert.deepEqual(Ember.keys(this.store._cache.stuff), ['42'], 'Last record was not cached');

  this.store.createRecord('stuff', {
    id: 75,
    stuff: 'Hello'
  });
  assert.deepEqual(Ember.keys(this.store._cache.stuff), ['42','75'], 'Last record was cached');
});

test('createRecord accepts extra data', function (assert) {
  var record = this.store.createRecord('stuff', {
    id: 42,
    stuff: 'Hi'
  }, {
    extra: 'Yeah'
  });
  assert.deepEqual(record.get('_data'), {
    id: 42,
    stuff: 'Hi'
  }, 'Record attributes are stored raw');
  assert.equal(record.get('extra'), 'Yeah', 'Extra data are set as record properties');
});


test('instanciate returns a record which is marked new & dirty', function (assert) {
  var done = assert.async();
  var record = this.store.instanciate('stuff', {
    id: 48
  });

  assert.equal(record.get('meta.isNew'), true, 'Record has meta.isNew false');
  assert.equal(record.get('meta.isDirty'), 'untouched', 'Record has meta.isDirty untouched');
  assert.equal(record.get('meta.isDeleted'), 'untouched', 'Record has meta.isDeleted untouched');
  Ember.run.next(this, function () {
    assert.equal(record.get('meta.isDirty'), true, 'Record has meta.isDirty true');

    done();
  });
});


test('load instanciate new record but meta.isNew is false', function (assert) {
  var record = this.store.load('stuff', {
    id: 42,
    stuff: 'Hop'
  });
  assert.equal(record.get('__modelFor__'), 'model:stuff', 'Record belongs to expected model');
  assert.equal(record.get('meta.isNew'), false, 'Record has meta.isNew false');
  assert.equal(record.get('meta.isDirty'), 'untouched', 'Record has meta.isDirty untouched');
  assert.equal(record.get('meta.isDeleted'), 'untouched', 'Record has meta.isDeleted untouched');
  assert.deepEqual(record.get('_data'), {
    id: 42,
    stuff: 'Hop'
  }, 'Record attributes are stored raw');
  assert.equal(record.get('cacheReset'), 1, 'Record caches are reset');
  assert.deepEqual(Ember.keys(this.store._cache.stuff), ['42'], 'Record is cached');
});

test('loadMany instanciate new records', function (assert) {
  var records = this.store.loadMany('stuff', [{
    id: 12,
    stuff: 'Hop'
  }, {
    id: 34,
    stuff: 'Yo'
  }]);
  assert.equal(records.length, 2, '2 records were created');
  records.forEach(function (record) {
    assert.equal(record.get('__modelFor__'), 'model:stuff', 'Record belongs to expected model');
    assert.equal(record.get('meta.isNew'), false, 'Record has meta.isNew false');
  });
  assert.deepEqual(Ember.keys(this.store._cache.stuff), ['12','34'], 'Record is cached');
});

test('sideLoad loads extra data', function (assert) {
  var data = {
    'user': {
      'id': 42,
      'first_name': 'John',
      'last_name': 'Doe',
      'post_ids': [ 1, 2, 3 ]
    },
    'comments': [{
      'id': 11,
      'text': 'Why not...'
    }, {
      'id': 12,
      'text': 'Incredible!'
    }, {
      'id': 13,
      'text': 'You think so?'
    }],
    'posts': [{
      'id': 1,
      'title': 'My first post',
      'comment_ids': [ 11 ]
    }, {
      'id': 2,
      'title': 'My second post',
      'comment_ids': []
    }, {
      'id': 3,
      'title': 'Yet another post',
      'comment_ids': [ 12, 13 ]
    }]
  };
  this.store.load('user', data);

  assert.ok(!Ember.isNone(this.store._cache.user), 'User records cache is defined');
  assert.deepEqual(Ember.keys(this.store._cache.user), [ '42' ], '1 user record cached');
  assert.ok(!Ember.isNone(this.store._cache.post), 'Post records cache is defined');
  assert.deepEqual(Ember.keys(this.store._cache.post), [ '1', '2', '3' ], '3 post records cached');
  assert.ok(!Ember.isNone(this.store._cache.comment), 'Comment records cache is defined');
  assert.deepEqual(Ember.keys(this.store._cache.comment), [ '11', '12', '13' ], '3 comment records cached');
});


module('Store find', {
  setup: function () {
    var Model = Ember.Object.extend({
      meta: null,

      init: function () {
        this._super();
        this.set('meta', Ember.Object.create({
            isNew: 'untouched',
            isDirty: 'untouched',
            isDeleted: 'untouched'
          })
        );
      },

      cacheReset: 0,
      resetCaches: function () {
        this.incrementProperty('cacheReset');
      },

      dirty: function () {
        this.set('meta.isDirty', true);
      }
    });

    this.store = Store.create({
      container: Ember.Object.create({
        lookupFactory: function (key) {
          return Model.extend({
            '__modelFor__': key
          });
        }
      }),
      adapter: Ember.Object.create({
        calls: [],

        find: function (model, request, result) {
          this.calls.push({
            model: model,
            request: request,
            result: result
          });
        }
      })
    });
  }
});

test('find one can run async', function (assert) {
  var result = this.store.find('stuff', 1);

  assert.ok(Ember.canInvoke(result, 'then'), 'find result is a promise');
  checkFindOne.call(this, assert, 1, true);
});

test('find one (string key) can run async', function (assert) {
  var result = this.store.find('stuff', '1');

  assert.ok(Ember.canInvoke(result, 'then'), 'find result is a promise');
  checkFindOne.call(this, assert, '1', true);
});

test('find one can run sync', function (assert) {
  var result = this.store.find('stuff', 1, null, { sync: true });

  assert.ok(!Ember.canInvoke(result, 'then'), 'find result is not a promise');
  checkFindOne.call(this, assert, 1, false);
});

test('find one (string key) can run sync', function (assert) {
  var result = this.store.find('stuff', '1', null, { sync: true });

  assert.ok(!Ember.canInvoke(result, 'then'), 'find result is not a promise');
  checkFindOne.call(this, assert, '1', false);
});

function checkFindOne (assert, id, async) {
  assert.equal(this.store.adapter.calls.length, 1, 'adapter has been called once');
  var call = this.store.adapter.calls[0];
  assert.deepEqual(call.model, { key: 'stuff', ids: id, parent: async ? undefined : null },
    'adapter.find has been called with expected model args');
  assert.deepEqual(call.request.findMany, false, 'adapter.find has been called for a single entity');
  assert.equal(call.request.async, async, 'adapter.find has been called sync');
  assert.deepEqual(call.request.options, async ? {} : { sync: true }, 'adapter.find has been called with expected options');
}


test('find many can run async', function (assert) {
  var result = this.store.find('stuff', [ 1, 2, 3 ]);

  assert.ok(Ember.canInvoke(result, 'then'), 'find result is a promise');
  checkFindMany.call(this, assert, [ 1, 2, 3 ], true);
});

test('find many can run sync', function (assert) {
  var result = this.store.find('stuff', [ 1, 2, 3 ], null, { sync: true });

  assert.ok(!Ember.canInvoke(result, 'then'), 'find result is not a promise');
  checkFindMany.call(this, assert, [ 1, 2, 3 ], false);
});

test('find many (filter) can run async', function (assert) {
  var result = this.store.find('stuff', { matching: 'bam' });

  assert.ok(Ember.canInvoke(result, 'then'), 'find result is a promise');
  checkFindMany.call(this, assert, [], true, {
    "params": {
      "matching": "bam"
    }
  });
});

test('find many (filter) can run sync', function (assert) {
  var result = this.store.find('stuff', { matching: 'bam' }, null, { sync: true });

  assert.ok(!Ember.canInvoke(result, 'then'), 'find result is not a promise');
  checkFindMany.call(this, assert, [], false, {
    "params": {
      "matching": "bam"
    }
  });
});

function checkFindMany (assert, ids, async, options) {
  assert.equal(this.store.adapter.calls.length, 1, 'adapter has been called once');
  var call = this.store.adapter.calls[0];
  assert.deepEqual(call.model, { key: 'stuff', ids: ids, parent: async ? undefined : null },
    'adapter.find has been called with expected model args');
  assert.deepEqual(call.request.findMany, true, 'adapter.find has been called for many entities');
  assert.equal(call.request.async, async, 'adapter.find has been called ' + (async ? 'async' : 'sync'));
  assert.deepEqual(call.request.options, Ember.merge(async ? {} : {
    sync: true
  }, options), 'adapter.find has been called with expected options');
}
