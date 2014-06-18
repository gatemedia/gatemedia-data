/* global module, test, asyncTest, start, ok, equal, ModelTest:true */

ModelTest = Ember.Application.create({
  apiUrl: Global.apiUrl,
  rootElement: '#model-test',

  adapter: Data.Adapter.create({
    baseUrl: Global.api.url,
    authParams: {
      // 'user_credentials': Auth.user.singleAccessToken
    }
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
  createdAt: Data.attr('datetime'),
  votes: Data.hasMany('ModelTest.Vote')
});

ModelTest.Vote = Data.Model.extend({
  note: Data.attr('number'),
  author: Data.attr('string')
});


module("Model retrieval", {
  setup: function () {
    Data.API.reset();
  }
});
(function () {
  asyncTest("API is called without any id to find all", function () {

    Data.API.stub().GET('posts', { "posts": [] });

    Ember.run(function () {
      ModelTest.Post.find().then(function (/*post*/) {
        equal(Data.API.XHR_REQUESTS.length, 1);
        equal(Data.API.XHR_REQUESTS[0].method, 'GET');
        equal(Data.API.XHR_REQUESTS[0].url, 'posts');
        start();
      });
    });
  });

  asyncTest("API is called with id to find one", function () {
    var postId = 68;

    Data.API.stub().GET('posts/%@'.fmt(postId), { "post": {} });

    Ember.run(function () {
      ModelTest.Post.find(postId).then(function (/*post*/) {
        equal(Data.API.XHR_REQUESTS.length, 1);
        equal(Data.API.XHR_REQUESTS[0].method, 'GET');
        equal(Data.API.XHR_REQUESTS[0].url, 'posts/%@'.fmt(postId));
        start();
      });
    });
  });

  asyncTest("API is called with passed options", function () {
    var options = { page: 1, count: 5 };

    Data.API.stub().GET('posts', options, { "posts": [{}] });

    Ember.run(function () {
      ModelTest.Post.find(options).then(function (/*post*/) {
        equal(Data.API.XHR_REQUESTS.length, 1);
        equal(Data.API.XHR_REQUESTS[0].method, 'GET');
        equal(Data.API.XHR_REQUESTS[0].url, 'posts');
        start();
      });
    });
  });

  asyncTest("Payload should be processed for deep-sideload", function () {
    var postId = 24632;

    Data.API.stub().GET('posts/%@'.fmt(postId), {
      'post': {
        'id': postId,
        'title': 'Discussion',
        'comment_ids': [ 100100, 100101 ]
      },
      'comments': [{
        'id': 100100,
        'text': 'Let us talk',
        'vote_ids': [ 100100100, 100100101, 100100102 ]
      }, {
        'id': 100101,
        'text': 'Why not',
        'vote_ids': [ 100101100, 100101101 ]
      }],
      'votes': [{
        'id': 100100100,
        'author': 'John',
        'note': 4
      },{
        'id': 100100101,
        'note': 2
      },{
        'id': 100100102,
        'note': 5
      },{
        'id': 100101100,
        'note': 4
      },{
        'id': 100101101,
        'note': 5
      }]
    });

    Ember.run(function () {
      ModelTest.Post.find(postId).then(function (post) {
        equal(Data.API.XHR_REQUESTS.length, 1, 'A single request has been issued');
        equal(Data.API.XHR_REQUESTS[0].method, 'GET');
        equal(Data.API.XHR_REQUESTS[0].url, 'posts/%@'.fmt(postId));

        equal(post.get('comments.length'), 2, 'Two comments have been sideloaded');
        equal(post.get('comments.firstObject.id'), 100100, 'First comment has been sideloaded (id)');
        equal(post.get('comments.firstObject.text'), 'Let us talk', 'First comment has been sideloaded (text)');
        equal(post.get('comments.firstObject.votes.length'), 3, 'First comment has 3 votes');
        equal(post.get('comments.firstObject.votes.firstObject.author'), 'John', 'First comment has first vote by John');
        equal(post.get('comments.firstObject.votes.firstObject.note'), 4, 'First comment has first vote with note 4');

        start();
      });
    });
  });
})();


module("Data extension: models");
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

  asyncTest("model can be found from API, and are cached (API is called once for each id)", function () {
    var postId = 36,
        postTitle = 'My thoughts about data';

    Data.API.stub().GET('posts/%@'.fmt(postId), { "post": { "id": postId, "title": postTitle } });

    Ember.run(function () {
      ModelTest.Post.find(36).then(function (post) {
        equal(post.get('id'), postId);
        equal(post.get('title'), postTitle);

        equal(Data.API.XHR_REQUESTS.length, 1);
        ModelTest.Post.find(36).then(function (/*post*/) {
          equal(Data.API.XHR_REQUESTS.length, 1);
          start();
        });
      }, function (error) {
        ok(false, error);
      });
    });
  });
})();


module("Model serialization");
(function () {
  var postId = 201, //TODO add store reset & call beforeEach
      postTitle = 'My very first post',
      postTimestamp = '2013-04-15T11:53Z',
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
    equal(post.get('createdAt').format(), moment(postTimestamp, 'YYYY-MM-DDTHH:mmZ').format());
  });

  test("relations are decoded from JSON", function () {
    var comments = post.get('comments');

    equal(comments.get('length'), 3);
    equal(comments.mapProperty('text').join(':'), [comment1, comment2, comment3].join(':'));
  });

  test("JSON serializes attributes & relations", function () {
    equal(JSON.stringify(post.toJSON()),
      //TODO check skipped relations
      '{"title":"%@","created_at":"%@","comment_ids":[201001,201002,201003]}'.fmt(
        postTitle,
        moment(postTimestamp, 'YYYY-MM-DDTHH:mmZ').format()));
  });

  test("JSON serializes specified properties & relations", function () {
    equal(JSON.stringify(post.toJSON(['title'])),
      '{"title":"%@"}'.fmt(postTitle));
    equal(JSON.stringify(post.toJSON(['title', 'comments'])),
      '{"title":"%@","comment_ids":[201001,201002,201003]}'.fmt(postTitle));
  });

  test("JSON serializes altered hasMany", function () {
    post.get('comments').pushObject(ModelTest.Comment.instanciate({
      id: 4
    }));

    equal(JSON.stringify(post.toJSON()),
      '{"title":"%@","created_at":"%@","comment_ids":[201001,201002,201003,4]}'.fmt(
        postTitle,
        moment(postTimestamp, 'YYYY-MM-DDTHH:mmZ').format()));
  });


  ModelTest.DictTest = Data.Model.extend({
    entries: Data.hasMany('ModelTest.EntryTest', { inline: true })
  });
  ModelTest.EntryTest = Data.Model.extend({
    key: Data.attr('string'),
    value: Data.attr('string')
  });

  var dict = ModelTest.DictTest.instanciate();

  test("JSON serializes inline hasMany", function () {
    dict.get('entries').pushObjects([
      ModelTest.EntryTest.instanciate({
        key: 'Letters',
        value: 'Abc'
      }),
      ModelTest.EntryTest.instanciate({
        key: 'Numbers',
        value: '123'
      })
    ]);

    equal(JSON.stringify(dict.toJSON()),
      '{"entries":[{"key":"Letters","value":"Abc"},{"key":"Numbers","value":"123"}]}');
  });
})();


module("Model saving: partial properties saving");
(function () {
  var postId = 202, //TODO add store reset & call beforeEach
      postTitle = 'My very first post',
      postTimestamp = '2013-04-15T11:53Z',
      comment = 'Yeah!...',
      post;

  ModelTest.Comment.loadMany([{
    'id': 202001,
    'post_id': postId,
    'text': comment
  }]);
  post = ModelTest.Post.load({
    'id': postId,
    'title': postTitle,
    'created_at': postTimestamp,
    'comment_ids': [ 202001 ]
  });

  asyncTest("Record serializes specified properties", function () {
    var newTitle = 'Hello world!';

    Data.API.stub().PUT('posts/%@'.fmt(postId), { "post": { "id": postId, "title": postTitle } });

    Ember.run(function () {
      post.set('title', newTitle);
      post.saveProperties('title').then(function () {
        equal(Data.API.XHR_REQUESTS.length, 1);
        equal(Data.API.XHR_REQUESTS[0].method, 'PUT');
        equal(Data.API.XHR_REQUESTS[0].url, 'posts/%@'.fmt(postId));
        equal(Data.API.XHR_REQUESTS[0].params, '{"post":{"title":"%@"}}'.fmt(newTitle));
        start();
      }, function (error) {
        ok(false, 'Failed: %@'.fmt(error));
      });
    });
  });
})();


module("Model saving: dirty model saving", {
  setup: function () {
    Data.API.reset();
  }
});
(function () {
  var postId = 100,
      postTitle = 'My very first post',
      post = ModelTest.Post.load({
    'id': postId,
    'title': postTitle,
    'created_at': '2014-02-25T17:54+01:00'
  });

  test("attributes changes dirty record", function () {
    equal(post.get('meta.isDirty'), false);
    post.set('title', 'My very very first post');
    equal(post.get('meta.isDirty'), true);
  });

  asyncTest("dirty record save calls API & restore cleanliness", function () {
    Data.API.stub().PUT('posts/%@'.fmt(postId), {
      'post': {
        'id': postId,
        'title': postTitle
      }
    });

    var saved = [];

    Ember.run(function () {
      post.on('record:saved', function (record) {
        saved.pushObject(record);
      });
      post.save().then(function (/*savedPost*/) {
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

  asyncTest("url should change according to model's state", function () {
    var user = ModelTest.User.instanciate(),
        newId = 42;

    Data.API.stub().POST('users', { "user": { id: newId } });

    Ember.run(function () {
      equal(user.get('_url'), 'users');
      user.save().then(function (user) {
        equal(newId, user.get('id'));
        equal(user.get('_url'), 'users/%@'.fmt(newId));
        start();
      }, function (error) {
        ok(false, error);
      });
    });
  });

  test("url should contain nested resource's parents paths, according to [follow] option", function () {
    equal(post.get('_url'), 'posts/%@'.fmt(postId));
    equal(comment.get('_url'), 'posts/%@/comments/%@'.fmt(postId, commentId));
  });
})();
