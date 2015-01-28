import Ember from 'ember';
import Store from 'gatemedia-data/utils/store';

module('Store basics');

test('modelFor retrieves model from key', function () {
  var store = Store.create({
    container: Ember.Object.create({
      lookupFactory: function (key) {
        return '%@:factory'.fmt(key);
      }
    })
  });

  equal(store.modelFor('stuff'), 'model:stuff:factory', 'modelFor return simply named model factory');
  equal(store.modelFor('test-stuff'), 'model:test-stuff:factory', 'modelFor return complex named model factory');
});


module('Store', {
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

test('createRecord expects data with ID', function () {
  throws(function () {
    this.store.createRecord('stuff');
  }.bind(this),
  new Error('Assertion Failed: Missing record id'),
  'Missing data ID fails');

  throws(function () {
    this.store.createRecord('stuff', { stuff: 'Hi' });
  }.bind(this),
  new Error('Assertion Failed: Missing record id'),
  'Missing data ID fails');
});

test('createRecord works & cache created instance if not embedded', function () {
  var record = this.store.createRecord('stuff', {
    id: 42,
    stuff: 'Hi'
  });
  equal(record.get('__modelFor__'), 'model:stuff', 'Record belongs to expected model');
  equal(record.get('meta.isNew'), 'untouched', 'Record has meta.isNew untouched');
  equal(record.get('meta.isDirty'), 'untouched', 'Record has meta.isDirty untouched');
  equal(record.get('meta.isDeleted'), 'untouched', 'Record has meta.isDeleted untouched');
  deepEqual(record.get('_data'), {
    id: 42,
    stuff: 'Hi'
  }, 'Record attributes are stored raw');
  deepEqual(Ember.keys(this.store._cache.stuff), ['42'], 'Record is cached');

  this.store.createRecord('stuff', {
    id: 36,
    stuff: 'Hi world'
  }, {
    _embeddedContainer: 'something'
  });
  deepEqual(Ember.keys(this.store._cache.stuff), ['42'], 'Last record was not cached');

  this.store.createRecord('stuff', {
    id: 75,
    stuff: 'Hello'
  });
  deepEqual(Ember.keys(this.store._cache.stuff), ['42','75'], 'Last record was cached');
});

test('createRecord accepts extra data', function () {
  var record = this.store.createRecord('stuff', {
    id: 42,
    stuff: 'Hi'
  }, {
    extra: 'Yeah'
  });
  deepEqual(record.get('_data'), {
    id: 42,
    stuff: 'Hi'
  }, 'Record attributes are stored raw');
  equal(record.get('extra'), 'Yeah', 'Extra data are set as record properties');
});


asyncTest('instanciate returns a record which is marked new & dirty', function () {
  var record = this.store.instanciate('stuff', {
    id: 48
  });

  equal(record.get('meta.isNew'), true, 'Record has meta.isNew false');
  equal(record.get('meta.isDirty'), 'untouched', 'Record has meta.isDirty untouched');
  equal(record.get('meta.isDeleted'), 'untouched', 'Record has meta.isDeleted untouched');
  Ember.run.next(this, function () {
    equal(record.get('meta.isDirty'), true, 'Record has meta.isDirty true');

    start();
  });
});


test('load instanciate new record but meta.isNew is false', function () {
  var record = this.store.load('stuff', {
    id: 42,
    stuff: 'Hop'
  });
  equal(record.get('__modelFor__'), 'model:stuff', 'Record belongs to expected model');
  equal(record.get('meta.isNew'), false, 'Record has meta.isNew false');
  equal(record.get('meta.isDirty'), 'untouched', 'Record has meta.isDirty untouched');
  equal(record.get('meta.isDeleted'), 'untouched', 'Record has meta.isDeleted untouched');
  deepEqual(record.get('_data'), {
    id: 42,
    stuff: 'Hop'
  }, 'Record attributes are stored raw');
  equal(record.get('cacheReset'), 1, 'Record caches are reset');
  deepEqual(Ember.keys(this.store._cache.stuff), ['42'], 'Record is cached');
});

test('loadMany instanciate new records', function () {
  var records = this.store.loadMany('stuff', [{
    id: 12,
    stuff: 'Hop'
  }, {
    id: 34,
    stuff: 'Yo'
  }]);
  equal(records.length, 2, '2 records were created');
  records.forEach(function (record) {
    equal(record.get('__modelFor__'), 'model:stuff', 'Record belongs to expected model');
    equal(record.get('meta.isNew'), false, 'Record has meta.isNew false');
  });
  deepEqual(Ember.keys(this.store._cache.stuff), ['12','34'], 'Record is cached');
});

test('sideLoad loads extra data', function () {
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

  ok(!Ember.isNone(this.store._cache.user), 'User records cache is defined');
  deepEqual(Ember.keys(this.store._cache.user), [ '42' ], '1 user record cached');
  ok(!Ember.isNone(this.store._cache.post), 'Post records cache is defined');
  deepEqual(Ember.keys(this.store._cache.post), [ '1', '2', '3' ], '3 post records cached');
  ok(!Ember.isNone(this.store._cache.comment), 'Comment records cache is defined');
  deepEqual(Ember.keys(this.store._cache.comment), [ '11', '12', '13' ], '3 comment records cached');
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

test('find one can run async', function () {
  var result = this.store.find('stuff', 1);

  ok(Ember.canInvoke(result, 'then'), 'find result is a promise');
  checkFindOne.call(this, 1, true);
});

test('find one (string key) can run async', function () {
  var result = this.store.find('stuff', '1');

  ok(Ember.canInvoke(result, 'then'), 'find result is a promise');
  checkFindOne.call(this, '1', true);
});

test('find one can run sync', function () {
  var result = this.store.find('stuff', 1, null, { sync: true });

  ok(!Ember.canInvoke(result, 'then'), 'find result is not a promise');
  checkFindOne.call(this, 1, false);
});

test('find one (string key) can run sync', function () {
  var result = this.store.find('stuff', '1', null, { sync: true });

  ok(!Ember.canInvoke(result, 'then'), 'find result is not a promise');
  checkFindOne.call(this, '1', false);
});

function checkFindOne (id, async) {
  equal(this.store.adapter.calls.length, 1, 'adapter has been called once');
  var call = this.store.adapter.calls[0];
  deepEqual(call.model, { key: 'stuff', ids: id, parent: async ? undefined : null },
    'adapter.find has been called with expected model args');
  deepEqual(call.request.findMany, false, 'adapter.find has been called for a single entity');
  equal(call.request.async, async, 'adapter.find has been called sync');
  deepEqual(call.request.options, async ? {} : { sync: true }, 'adapter.find has been called with expected options');
}


test('find many can run async', function () {
  var result = this.store.find('stuff', [ 1, 2, 3 ]);

  ok(Ember.canInvoke(result, 'then'), 'find result is a promise');
  checkFindMany.call(this, [ 1, 2, 3 ], true);
});

test('find many can run sync', function () {
  var result = this.store.find('stuff', [ 1, 2, 3 ], null, { sync: true });

  ok(!Ember.canInvoke(result, 'then'), 'find result is not a promise');
  checkFindMany.call(this, [ 1, 2, 3 ], false);
});

test('find many (filter) can run async', function () {
  var result = this.store.find('stuff', { matching: 'bam' });

  ok(Ember.canInvoke(result, 'then'), 'find result is a promise');
  checkFindMany.call(this, [], true, {
    "params": {
      "matching": "bam"
    }
  });
});

test('find many (filter) can run sync', function () {
  var result = this.store.find('stuff', { matching: 'bam' }, null, { sync: true });

  ok(!Ember.canInvoke(result, 'then'), 'find result is not a promise');
  checkFindMany.call(this, [], false, {
    "params": {
      "matching": "bam"
    }
  });
});

function checkFindMany (ids, async, options) {
  equal(this.store.adapter.calls.length, 1, 'adapter has been called once');
  var call = this.store.adapter.calls[0];
  deepEqual(call.model, { key: 'stuff', ids: ids, parent: async ? undefined : null },
    'adapter.find has been called with expected model args');
  deepEqual(call.request.findMany, true, 'adapter.find has been called for many entities');
  equal(call.request.async, async, 'adapter.find has been called ' + (async ? 'async' : 'sync'));
  deepEqual(call.request.options, Ember.merge(async ? {} : {
    sync: true
  }, options), 'adapter.find has been called with expected options');
}
