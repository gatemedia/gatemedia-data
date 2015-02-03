import Ember from 'ember';
import ModelArray from 'gatemedia-data/utils/model-array';
import Model from 'gatemedia-data/utils/model';
import attribute from 'gatemedia-data/utils/attribute';
import belongsTo from 'gatemedia-data/utils/belongs-to';
import hasMany from 'gatemedia-data/utils/has-many';

module('model-array', {
  setup: function () {
    var Orphan = Model.extend({
    });

    var Post = Model.extend({
      title: attribute('string'),
      comments: hasMany('comment', { cascadeSaving: true })
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
      _type: 'comment',
      _owner: this.post,
      _store: this.store,
      content: []
    });
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
//TODO test: pushObject
//TODO test: pushObjects
//TODO test: removeObject
//TODO test: removeObjects


// test('deleted record should be removed from array', function () {
//   var comments = [
//     this.array.createRecord({
//       'id': 1001001,
//       'text': 'Great! I like it'
//     }),
//     this.array.createRecord({
//       'id': 1001002,
//       'text': 'Sorry but I do not agree'
//     }),
//     this.array.createRecord({
//       'id': 1001003,
//       'text': 'Could be better...'
//     })
//   ];

//   equal(this.array.get('length'), 3, 'Array has 3 comments');
//   equal(this.post.get('comments.length'), 3, 'Post has 3 comments');
//   comments[2].deleteRecord();
//   equal(this.array.get('length'), 2, 'Array has 2 comments');
//   equal(this.post.get('comments.length'), 2, 'Post has 2 comments');
// });
