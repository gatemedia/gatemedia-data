/* global module:false, test:false, asyncTest:false, start:false, ok:false, equal:false, withFakeAdapter:false, ModelTest:true */

ModelTest = Ember.Application.create({
  apiUrl: Global.apiUrl,
  rootElement: '#' + $('<div id="model-test">').appendTo('body').attr('id'),

  adapter: Data.FakeAdapter.create({
    baseUrl: Global.apiUrl,
    authParams: {}
  })
});

ModelTest.User = Data.Model.extend({
  name: Data.attr('string'),
  posts: Data.hasMany('ModelTest.Posts')
});

ModelTest.Post = Data.Model.extend({
  user: Data.belongsTo('ModelTest.User', { owner: true, follow: false }),
  title: Data.attr('string'),
  createdAt: Data.attr('datetime'),
  comments: Data.hasMany('ModelTest.Comment')
});

ModelTest.Comment = Data.Model.extend({
  post: Data.belongsTo('ModelTest.Post', { owner: true }),
  text: Data.attr('string'),
  author: Data.attr('string'),
  createdAt: Data.attr('datetime')
});


module("Model retrieval", withFakeAdapter(ModelTest.adapter));
(function () {
  asyncTest("API is called without any id to find all", function () {

    ModelTest.adapter.fakeXHR('GET', 'posts', { "posts": [] });

    Ember.run(function () {
      ModelTest.Post.find().then(function (post) {
        equal(ModelTest.adapter.XHR_REQUESTS.length, 1);
        equal(ModelTest.adapter.XHR_REQUESTS[0].method, 'GET');
        equal(ModelTest.adapter.XHR_REQUESTS[0].url, 'posts');
        start();
      });
    });
  });

  asyncTest("API is called with id to find one", function () {
    var postId = 68;

    ModelTest.adapter.fakeXHR('GET', 'posts/%@'.fmt(postId), { "post": {} });

    Ember.run(function () {
      ModelTest.Post.find(postId).then(function (post) {
        equal(ModelTest.adapter.XHR_REQUESTS.length, 1);
        equal(ModelTest.adapter.XHR_REQUESTS[0].method, 'GET');
        equal(ModelTest.adapter.XHR_REQUESTS[0].url, 'posts/%@'.fmt(postId));
        start();
      });
    });
  });

  asyncTest("API is called with passed options", function () {
    var
      options = { page: 1, count: 5 };

    ModelTest.adapter.fakeXHR('GET', 'posts?page=1&count=5', { "posts": [{}] });

    Ember.run(function () {
      ModelTest.Post.find(options).then(function (post) {
        equal(ModelTest.adapter.XHR_REQUESTS.length, 1);
        equal(ModelTest.adapter.XHR_REQUESTS[0].method, 'GET');
        equal(ModelTest.adapter.XHR_REQUESTS[0].url, 'posts?page=1&count=5');
        start();
      });
    });
  });
})();


module("Data extension: models", withFakeAdapter(ModelTest.adapter));
(function () {
  test("model can be loaded from JSON", function () {
    var
      postId = 42,
      postTitle = 'My very first post',
      post = ModelTest.Post.load({
        id: postId,
        title: postTitle
      });

    equal(post.get('id'), postId);
    equal(post.get('title'), postTitle);
  });

  test("model can be found from API, and are cached (API is called once for each id)", function () {
    var postId = 36,
        postTitle = 'My thoughts about data';

    ModelTest.adapter.fakeXHR('GET', 'posts/%@'.fmt(postId), { "post": { "id": postId, "title": postTitle } });

    Ember.run(function () {
      ModelTest.Post.find(36).then(function (post) {
        equal(post.get('id'), postId);
        equal(post.get('title'), postTitle);

        equal(ModelTest.adapter.XHR_REQUESTS.length, 1);
        ModelTest.Post.find(36).then(function (post) {
          equal(ModelTest.adapter.XHR_REQUESTS.length, 1);
        });
      }, function (error) {
        ok(false, error);
      });
    });
  });
})();


module("Model seralization");
(function () {
  var postId = 201, //TODO add store reset & call beforeEach
    postTitle = 'My very first post',
    postTimestamp = '2013-04-15 11:53',
    comment1 = 'Great! I like it',
    comment2 = 'Sorry but I do not agree',
    comment3 = 'Could be better...',
    post;
  
  ModelTest.Comment.loadMany([{
    'id': 201001,
    'post_id': postId,
    'text': comment1
  }, {
    'id': 201002,
    'post_id': postId,
    'text': comment2
  }, {
    'id': 201003,
    'post_id': postId,
    'text': comment3
  }]);
  post = ModelTest.Post.load({
    'id': postId,
    'title': postTitle,
    'created_at': postTimestamp,
    'comment_ids': [ 201001, 201002, 201003 ]
  });

  test("attributes are decoded from JSON", function () {
    equal(post.get('id'), postId);
    equal(post.get('title'), postTitle);
    equal(post.get('createdAt').format(), moment(postTimestamp, 'YYYY-MM-DD hh:mm').format());
  });

  test("relations are decoded from JSON", function () {
    var comments = post.get('comments');

    equal(comments.get('length'), 3);
    equal(comments.mapProperty('text').join(':'), [comment1, comment2, comment3].join(':'));
  });

  test("JSON seralizes attributes & relations", function () {
    equal(JSON.stringify(post.toJSON()),
      //TODO check skipped relations
      '{"title":"%@","created_at":"%@","comment_ids":[201001,201002,201003]}'.fmt(
        postTitle,
        postTimestamp));
  });

  test("JSON serializes altered hasMany", function () {
    post.get('comments').pushObject(ModelTest.Comment.instanciate({
      id: 4
    }));

    equal(JSON.stringify(post.toJSON()),
      '{"title":"%@","created_at":"%@","comment_ids":[201001,201002,201003,4]}'.fmt(
        postTitle,
        postTimestamp));
  });
})();


module("Model saving: dirty model saving", withFakeAdapter(ModelTest.adapter));
(function () {
  var
    postId = 100,
    postTitle = 'My very first post',
    post = ModelTest.Post.load({
      id: postId,
      title: postTitle
    });

  test("attributes changes dirty record", function () {
    equal(post.get('meta.isDirty'), false);
    post.set('title', 'My very very first post');
    equal(post.get('meta.isDirty'), true);
  });

  asyncTest("dirty record save calls API & restore cleanliness", function () {
    ModelTest.adapter.fakeXHR('PUT', 'posts/%@'.fmt(postId), { "post": { "id": postId, "title": postTitle } });

    var saved = [];

    Ember.run(function () {
      post.on('record:saved', function (record) {
        saved.pushObject(record);
      });
      post.save().then(function (savedPost) {
        equal(post.get('meta.isDirty'), false);
        equal(saved.length, 1);
        equal(saved[0], post);
        start();
      });
    });
  });
})();


module("Model saving: dirty children dirty parent model");
(function () {
  var
    postId = 101,
    postTitle = 'My very first post',
    commentText = 'Great! I like it',
    comment = ModelTest.Comment.load({
      'post_id': postId,
      'id': 101001,
      'text': commentText
    }),
    post = ModelTest.Post.load({
      'id': postId,
      'title': postTitle,
      'comment_ids': [ 101001 ]
    });

  test("modifying without change do not dirty it", function () {
    post.set('comments.firstObject.text', commentText);
    equal(post.get('comments.firstObject.meta.isDirty'), false);
  });

  test("modifying child dirty it and also parent", function () {
    post.set('comments.firstObject.text', 'Yeah! it rocks');
    equal(post.get('comments.firstObject.meta.isDirty'), true);
    equal(post.get('meta.isDirty'), true);
  });

  test("canceling dirty child changes also cleans dirty parent", function () {
    post.set('comments.firstObject.text', 'Yeah! it rocks');
    equal(comment.get('meta.isDirty'), true);
    comment.cancelChanges();
    equal(comment.get('meta.isDirty'), false);
    equal(post.get('meta.isDirty'), false);
  });
})();

//TODO:TEST record save propagates to (dereferenced only) children
//TODO:TEST unchanged record save even propagates to children

//TODO:TEST cancelChanges descends children (if nested)


module("Model saving: dirty record changes can be canceled");
(function () {
  var postId = 102,
      postTitle = 'My changing post',
      post;

  post = ModelTest.Post.load({
    id: postId,
    title: postTitle
  });

  test("attributes changes dirty record", function () {
    equal(post.get('meta.isDirty'), false);
    post.set('title', 'My changed post');
    equal(post.get('meta.isDirty'), true);
  });

  test("cancel changes cleans record", function () {
    post.cancelChanges();
    post.get('title', 'My changing post');
    equal(post.get('meta.isDirty'), false);
  });
})();


module("Model mapping");
(function () {
  var userId = 301,
    postId = 301001,
    commentId = 301001001, //TODO add store reset & call beforeEach
    postTitle = 'My very first post',
    postTimestamp = '2013-04-15 11:53',
    user = ModelTest.User.load({
      id: userId,
      name: 'Bob'
    }),
    post = ModelTest.Post.load({
      'id': postId,
      'user_id': userId,
      'title': postTitle,
      'created_at': postTimestamp,
      'comment_ids': [ commentId ]
    }),
    comment = ModelTest.Comment.load({
      'id': commentId,
      'post_id': postId,
      'text': 'Great! I like it'
    });

  test("url should match standard REST format", function () {
    equal(user.get('_url'), 'users/%@'.fmt(userId));
  });

  test("url should contain nested resource's parents paths, according to [follow] option", function () {
    equal(post.get('_url'), 'posts/%@'.fmt(postId));
    equal(comment.get('_url'), 'posts/%@/comments/%@'.fmt(postId, commentId));
  });
})();
