import Ember from 'ember';
import ModelArray from 'gatemedia-data/utils/model-array';
import Adapter from 'gatemedia-data/utils/adapter';
import Model from 'gatemedia-data/utils/model';
import attribute from 'gatemedia-data/utils/attribute';
import belongsTo from 'gatemedia-data/utils/belongs-to';
import hasMany from 'gatemedia-data/utils/has-many';

module('ModelArray');

test('it works', function() {
  var result = ModelArray;
  ok(result);
});





// module, test, asyncTest, start,
//          ok, equal, deepEqual, throws,
//          ModelArrayTest:true 

var ModelArrayTest = Ember.Application.create({
  apiUrl: 'https://api.com',
  rootElement: '#ember-testing',

  adapter: Adapter.create({
    baseUrl: 'https://data.api.com'
  })
});

ModelArrayTest.Post = Model.extend({
  title: attribute('string'),
  createdAt: attribute('datetime'),
  comments: hasMany('ModelArrayTest.Comment', { cascadeSaving: true })
});

ModelArrayTest.Comment = Model.extend({
  post: belongsTo('ModelArrayTest.Post', { owner: true }),
  text: attribute('string', { defaultValue: '' }),
  author: attribute('string'),
  createdAt: attribute('datetime')
});


ModelArrayTest.BadPost = Model.extend({
  comments: hasMany('ModelArrayTest.BadComment')
});

ModelArrayTest.BadComment = Model.extend({
  post: belongsTo('ModelArrayTest.BadPost')
});


module("Data extension: model array");

test("record creation should prevent type without any owner relation", function () {
  var post = ModelArrayTest.BadPost.load({});

  throws(
    function () {
      post.get('comments').createRecord();
    },
    'paf');
});

test("record creation should prevent owner attribute and container owner mismatch", function () {
  var postId1 = 101,
      postId2 = 102,
      postTitle1 = 'My very first post',
      postTitle2 = 'My less first post',
      post1, post2;

  post1 = ModelArrayTest.Post.load({
    id: postId1,
    title: postTitle1
  });
  post2 = ModelArrayTest.Post.load({
    id: postId2,
    title: postTitle2
  });

  throws(
    function () {
      post1.get('comments').createRecord({
        'post_id': postId2
      });
    },
    'paf');
});

test("record creation should auto-parent new records to owner", function () {
  var postId = 200,
      postTitle = 'My very first post',
      now = moment(),
      post, comment;

  post = ModelArrayTest.Post.load({
    'id': postId,
    'title': postTitle
  });
  comment = post.get('comments').createRecord({
    'created_at': now
  });

  equal(comment.get('post'), post);
  var gotJSON = comment.toJSON(),
    expectedJSON = {
      'text': '',
      'author': null,
      'created_at': now.format('YYYY-MM-DDTHH:mm:ssZ'),
      'post_id': postId
    };
  deepEqual(gotJSON, expectedJSON, '\n%@\ndoes not deep equals\n%@\n'.fmt(
      Ember.inspect(gotJSON),
      Ember.inspect(expectedJSON)
  ));
});

asyncTest("new records should be saved after owner", 1, function () {
  var postId = 300,
      postTitle = 'My very first post',
      now = moment(),
      post, comment;

  post = ModelArrayTest.Post.load({
    'id': postId,
    'title': postTitle
  });
  comment = post.get('comments').createRecord({
    'created_at': now
  });

  // Post not changed, useless: fakeXHR('PUT', 'posts/%@'.fmt(postId), { "post": { "id": postId, "title": postTitle } });
  Data.API.stub().POST('posts/%@/comments'.fmt(postId), { 'comments': [{ 'id': 300100, 'post_id': postId }] });

  Ember.run(function () {
    post.save().then(function () {
      equal(Data.API.XHR_REQUESTS.length, 1);
      start();
    }, function (error) {
      ok(false, 'Failed: %@'.fmt(error));
    });
  });
});


test("deleted record should be removed from array", function () {
  var postId = 1001,
      postTitle = 'My very first post',
      comment1 = 'Great! I like it',
      comment2 = 'Sorry but I do not agree',
      comment3 = 'Could be better...',
      comments, post, postComments;

  comments = ModelArrayTest.Comment.loadMany([{
    'id': 1001001,
    'post_id': postId,
    'text': comment1
  }, {
    'id': 1001002,
    'post_id': postId,
    'text': comment2
  }, {
    'id': 1001003,
    'post_id': postId,
    'text': comment3
  }]);
  post = ModelArrayTest.Post.load({
    'id': postId,
    'title': postTitle,
    'comment_ids': [ 1001001, 1001002, 1001003 ]
  });
  postComments = post.get('comments');

  equal(postComments.get('length'), 3);
  comments[2].deleteRecord();
  equal(postComments.get('length'), 2);
});
