import Ember from 'ember';
import ModelArray from 'gatemedia-data/utils/model-array';
import Model from 'gatemedia-data/utils/model';
import attribute from 'gatemedia-data/utils/attribute';
import belongsTo from 'gatemedia-data/utils/belongs-to';
import hasMany from 'gatemedia-data/utils/has-many';
import startApp from '../../helpers/start-app';

module('model-array', {
  setup: function () {
    var Orphan = Model.extend({
    });

    var Post = Model.extend({
      title: attribute('string'),
      comments: hasMany('comment', { cascadeSaving: true }),

      init: function () {
        this._super();
        this.setProperties({
          addedRelations: [],
          removedRelations: []
        });
      },
      _addRelation: function (field, object) {
        this.get('addedRelations').pushObject('%@ + %@'.fmt(field, object.get('id')));
      },
      _removeRelation: function (field, object) {
        this.get('removedRelations').pushObject('%@ - %@'.fmt(field, object.get('id')));
      }
    });
    var Comment = Model.extend({
      post: belongsTo('post', { owner: true }),
      text: attribute('string', { defaultValue: '' }),
      author: attribute('string'),
      createdAt: attribute('datetime')
    });

    var BadPost = Model.extend({
      comments: hasMany('badComment')
    });

    var BadComment = Model.extend({
      post: belongsTo('badPost')
    });


    this.testAdapter = Ember.Object.create({
      saved: [],

      save: function (record, extraParams, includeProperties) {
        this.get('saved').pushObject({
          record: record.toJSON(),
          extraParams: extraParams,
          includeProperties: includeProperties
        });
        return new Ember.RSVP.Promise(function (resolve/*, reject*/) {
          resolve(record);
        });
      }
    });


    this.store = Ember.Object.create({
      adapter: this.testAdapter,

      modelFor: function (key) {
        switch (key) {
        case 'orphan':
          return Orphan;
        case 'post':
          return Post;
        case 'comment':
          return Comment;
        case 'badPost':
          return BadPost;
        case 'badComment':
          return BadComment;
        }
      },

      instanciate: function (key, data) {
        return this.modelFor(key).create({
          _store: this,
          _data: data
        });
      },

      find: function () {
        throw('Not stubbed...');
      }
    });

    this.post = this.store.instanciate('post', {
      id: 42
    });
    this.array = ModelArray.create({
      _field: 'comments',
      _type: 'comment',
      _owner: this.post,
      _store: this.store,
      content: []
    });

    startApp();
  }
});

test('creation', function() {
  deepEqual(this.array.get('_removed'), [], 'No object removed');
});

test('record creation should prevent type without any owner relation', function () {
  var orphans = ModelArray.create({
    _type: 'orphan',
    _owner: this.post,
    _store: this.store
  });

  throws(
    function () {
      orphans.createRecord();
    },
    'createRecord thrown');
});

test('record creation should prevent owner attribute and container owner mismatch', function () {
  var otherPost = this.store.instanciate('post', {
    id: 36
  });

  throws(
    function () {
      this.array.createRecord({
        'post_id': otherPost
      });
    },
    'Mismatching parent failed createRecord');
});

test('record creation should auto-parent new records to owner', function () {
  var now = moment().utc(),
      comment = this.array.createRecord({
    'text': "Nice, isn't it?",
    'created_at': now
  });

  equal(comment.get('post.id'), this.post.get('id'), 'Comment has been parented');
  deepEqual(
    comment.toJSON(), {
    'text': "Nice, isn't it?",
    'author': null,
    'created_at': now.format('YYYY-MM-DDTHH:mm:ssZ'),
    'post_id': 42
  }, 'Serialized comment is: %@'.fmt(comment.toJSON()));
});

asyncTest('new records should be saved', 1, function () {
  var t1 = moment().utc(),
      t2 = t1.clone().add(1, 'minute');

  this.array.createRecord({
    'text': "Hello...",
    'created_at': t1
  });
  this.array.createRecord({
    'text': "... world!",
    'created_at': t2
  });

  // Post not changed, useless: fakeXHR('PUT', 'posts/%@'.fmt(postId), { "post": { "id": postId, "title": postTitle } });
  // Data.API.stub().POST('posts/%@/comments'.fmt(this.post.get('id')), { 'comments': [{ 'id': 300100, 'post_id': this.post.get('id') }] });

  var self = this;
  this.array.save().then(function () {
    deepEqual(
      self.testAdapter.saved,
      [{
        record: {
          'text': "Hello...",
          'author': null,
          'created_at': t1.format(),
          'post_id': self.post.get('id')
        },
        extraParams: undefined,
        includeProperties: undefined
      }, {
        record: {
          'text': "... world!",
          'author': null,
          'created_at': t2.format(),
          'post_id': self.post.get('id')
        },
        extraParams: undefined,
        includeProperties: undefined
      }], 'Records have been saved');
    start();
  }, function (error) {
    ok(false, 'Failed: %@'.fmt(error));
  });
});

//TODO test: assignRecord
//TODO test: assignRecords
//TODO test: cancelChanges
//TODO test: clear

test('pushed record should not affect owner', function () {
  var now = moment().utc();

  equal(this.array.get('length'), 0, 'Array has no comment');
  equal(this.post.get('addedRelations.length'), 0, 'Post has no added relation');

  this.array.pushObject(
    this.store.instanciate('comment', {
      'id': 1001001,
      'text': 'Great! I like it',
      'author': 'Me',
      'created_at': now
    })
  );

  equal(this.array.get('length'), 1, 'Array has 1 comment');
  equal(this.post.get('addedRelations.length'), 0, 'Post still has no added relation');
});

test('pushed record should affect owner', function () {
  var now = moment().utc();

  equal(this.array.get('length'), 0, 'Array has no comment');
  equal(this.post.get('addedRelations.length'), 0, 'Post has no added relation');

  this.array.set('_affectOwner', true);

  this.array.pushObject(
    this.store.instanciate('comment', {
      'id': 1001001,
      'text': 'Great! I like it',
      'author': 'Me',
      'created_at': now
    })
  );

  equal(this.array.get('length'), 1, 'Array has 1 comment');
  equal(this.post.get('addedRelations.length'), 1, 'Post has 1 added relation');
  equal(this.post.get('addedRelations.firstObject'), 'comments + 1001001', 'Post has 1 added relation');
});

test('pushed records should not affect owner', function () {
  var now = moment().utc();

  equal(this.array.get('length'), 0, 'Array has no comment');
  equal(this.post.get('addedRelations.length'), 0, 'Post has no added relation');

  this.array.pushObjects([
    this.store.instanciate('comment', {
      'id': 1001001,
      'text': 'Great! I like it',
      'author': 'Me',
      'created_at': now
    }),
    this.store.instanciate('comment', {
      'id': 1001002,
      'text': 'Great! I like it again',
      'author': 'Me',
      'created_at': now
    })
  ]);

  equal(this.array.get('length'), 2, 'Array has 2 comments');
  equal(this.post.get('addedRelations.length'), 0, 'Post still has no added relation');
});

test('pushed records should affect owner', function () {
  var now = moment().utc();

  equal(this.array.get('length'), 0, 'Array has no comment');
  equal(this.post.get('addedRelations.length'), 0, 'Post has no added relation');

  this.array.set('_affectOwner', true);

  this.array.pushObjects([
    this.store.instanciate('comment', {
      'id': 1001001,
      'text': 'Great! I like it',
      'author': 'Me',
      'created_at': now
    }),
    this.store.instanciate('comment', {
      'id': 1001002,
      'text': 'Great! I like it again',
      'author': 'Me',
      'created_at': now
    })
  ]);

  equal(this.array.get('length'), 2, 'Array has 2 comments');
  equal(this.post.get('addedRelations.length'), 2, 'Post has 1 added relation');
  equal(this.post.get('addedRelations').sort().join(', '), 'comments + 1001001, comments + 1001002', 'Post has 1 added relation');
});

asyncTest('deleted record should be removed from array when saving', function () {
  var now = moment().utc(),
      comments = [
    this.array.createRecord({
      'id': 1001001,
      'text': 'Great! I like it',
      'author': 'Me',
      'created_at': now
    }),
    this.array.createRecord({
      'id': 1001002,
      'text': 'Sorry but I do not agree',
      'author': 'You',
      'created_at': now
    }),
    this.array.createRecord({
      'id': 1001003,
      'text': 'Could be better...',
      'author': 'Him',
      'created_at': now
    })
  ];

  equal(this.array.get('length'), 3, 'Array has 3 comments');
  equal(this.post.get('removedRelations.length'), 0, 'Post has no removed relation');

  this.array.removeObject(comments[2]);

  var self = this;
  this.array.save().then(function (saved) {
    equal(saved.get('length'), 2, 'Saved 2 comments');
    equal(self.array.get('length'), 2, 'Array has 2 comments');
    equal(self.post.get('removedRelations.length'), 0, 'Post has no removed relation');

    start();
  });
});

asyncTest('deleted record should be removed from array & from owner when saving', function () {
  var now = moment().utc(),
      comments = [
    this.array.createRecord({
      'id': 1001001,
      'text': 'Great! I like it',
      'author': 'Me',
      'created_at': now
    }),
    this.array.createRecord({
      'id': 1001002,
      'text': 'Sorry but I do not agree',
      'author': 'You',
      'created_at': now
    }),
    this.array.createRecord({
      'id': 1001003,
      'text': 'Could be better...',
      'author': 'Him',
      'created_at': now
    })
  ];

  this.array.set('_affectOwner', true);

  equal(this.array.get('length'), 3, 'Array has 3 comments');
  equal(this.post.get('removedRelations.length'), 0, 'Post has no removed relation');

  this.array.removeObject(comments[2]);

  var self = this;
  this.array.save().then(function (saved) {
    equal(saved.get('length'), 2, 'Saved 2 comments');
    equal(self.array.get('length'), 2, 'Array has 2 comments');
    equal(self.post.get('removedRelations.length'), 1, 'Post has one removed relation');
    equal(self.post.get('removedRelations.firstObject'), 'comments - 1001003', 'Post has expected removed relation');

    start();
  });
});

asyncTest('deleted records should be removed from array when saving', function () {
  var now = moment().utc(),
      comments = [
    this.array.createRecord({
      'id': 1001001,
      'text': 'Great! I like it',
      'author': 'Me',
      'created_at': now
    }),
    this.array.createRecord({
      'id': 1001002,
      'text': 'Sorry but I do not agree',
      'author': 'You',
      'created_at': now
    }),
    this.array.createRecord({
      'id': 1001003,
      'text': 'Could be better...',
      'author': 'Him',
      'created_at': now
    })
  ];

  equal(this.array.get('length'), 3, 'Array has 3 comments');
  equal(this.post.get('removedRelations.length'), 0, 'Post has no removed relation');

  this.array.removeObjects([
    comments[0],
    comments[2]
  ]);

  var self = this;
  this.array.save().then(function (saved) {
    equal(saved.get('length'), 1, 'Saved 1 comments');
    equal(self.array.get('length'), 1, 'Array has 1 comment');
    equal(self.post.get('removedRelations.length'), 0, 'Post has no removed relation');

    start();
  });
});

asyncTest('deleted records should be removed from array & from owner when saving', function () {
  var now = moment().utc(),
      comments = [
    this.array.createRecord({
      'id': 1001001,
      'text': 'Great! I like it',
      'author': 'Me',
      'created_at': now
    }),
    this.array.createRecord({
      'id': 1001002,
      'text': 'Sorry but I do not agree',
      'author': 'You',
      'created_at': now
    }),
    this.array.createRecord({
      'id': 1001003,
      'text': 'Could be better...',
      'author': 'Him',
      'created_at': now
    })
  ];

  this.array.set('_affectOwner', true);

  equal(this.array.get('length'), 3, 'Array has 3 comments');
  equal(this.post.get('removedRelations.length'), 0, 'Post has no removed relation');

  this.array.removeObjects([
    comments[0],
    comments[2]
  ]);

  var self = this;
  this.array.save().then(function (saved) {
    equal(saved.get('length'), 1, 'Saved 1 comments');
    equal(self.array.get('length'), 1, 'Array has 1 comment');
    equal(self.post.get('removedRelations.length'), 2, 'Post has 2 removed relations');
    equal(self.post.get('removedRelations').sort().join(', '), 'comments - 1001001, comments - 1001003',
      'Post has expected removed relations');

    start();
  });
});
