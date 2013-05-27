
ModelTest = Ember.Namespace.create();

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


module("Data extension: models", withFakeAPI);
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
        var
            postId = 36,
            postTitle = 'My thoughts about data';

        fakeAPI(api, 'GET', 'posts/%@'.fmt(postId), '{ "post": { "id": %@, "title": "%@" } }'.fmt(postId, postTitle));

        ModelTest.Post.find(36).then(function (post) {
            equal(post.get('id'), postId);
            equal(post.get('title'), postTitle);

            equal(api.requests.length, 1);
            ModelTest.Post.find(36).then(function (post) {
                equal(api.requests.length, 1);

                start();
            });
        }, function (error) {
            ok(false, error);
            start();
        });

        api.respond();
    });
})();


module("seralization", withFakeAPI);
(function () {
    var
        postId = 201, //TODO add store reset & call beforeEach
        postTitle = 'My very first post',
        postTimestamp = '2013-04-15 11:53',
        comment1 = 'Great! I like it',
        comment2 = 'Sorry but I do not agree',
        comment3 = 'Could be better...',
        comments = ModelTest.Comment.loadMany([{
            id: 201001,
            post_id: postId,
            text: comment1
        }, {
            id: 201002,
            post_id: postId,
            text: comment2
        }, {
            id: 201003,
            post_id: postId,
            text: comment3
        }]),
        post = ModelTest.Post.load({
            id: postId,
            title: postTitle,
            created_at: postTimestamp,
            comment_ids: [ 201001, 201002, 201003 ]
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
})();


module("Model saving: dirty model saving", withFakeAPI);
(function () {
    var
        postId = 100,
        postTitle = 'My very first post',
        post = ModelTest.Post.load({
            id: postId,
            title: postTitle
        });

    test("attributes changes dirty record", function () {
        equal(post.get('isDirty'), false);
        post.set('title', 'My very very first post');
        equal(post.get('isDirty'), true);
    });

    asyncTest("dirty record save calls API & restore cleanliness", function () {
        fakeAPI(api, 'PUT', 'posts/%@'.fmt(postId), '{ "post": { "id": %@, "title": "%@" } }'.fmt(postId, postTitle));

        Ember.run(function () {
            post.save().then(function (savedPost) {
                equal(post.get('isDirty'), false);
                start();
            });
        });

        api.respond();
    });
})();


module("Model saving: dirty children dirty parent model", withFakeAPI);
(function () {
    var
        postId = 101,
        postTitle = 'My very first post',
        commentText = 'Great! I like it',
        comment = ModelTest.Comment.load({
            post_id: postId,
            id: 101001,
            text: commentText
        }),
        post = ModelTest.Post.load({
            id: postId,
            title: postTitle,
            comment_ids: [ 101001 ]
        });

    test("modifying without change do not dirty it", function () {
        post.set('comments.firstObject.text', commentText);
        equal(post.get('comments.firstObject.isDirty'), false);
    });

    test("modifying child dirty it and also parent", function () {
        post.set('comments.firstObject.text', 'Yeah! it rocks');
        equal(post.get('comments.firstObject.isDirty'), true);
        equal(post.get('isDirty'), true);
    });

    test("canceling dirty child changes also cleans dirty parent", function () {
        post.set('comments.firstObject.text', 'Yeah! it rocks');
        equal(comment.get('isDirty'), true);
        comment.cancelChanges();
        equal(comment.get('isDirty'), false);
        equal(post.get('isDirty'), false);
    });
})();

//TODO:TEST record save propagates to (dereferenced only) children
//TODO:TEST unchanged record save even propagates to children

//TODO:TEST cancelChanges descends children (if nested)


module("Model saving: dirty record changes can be canceled", withFakeAPI);
(function () {
    var
        postId = 102,
        postTitle = 'My changing post',
        post = ModelTest.Post.load({
            id: postId,
            title: postTitle
        });

    test("attributes changes dirty record", function () {
        equal(post.get('isDirty'), false);
        post.set('title', 'My changed post');
        equal(post.get('isDirty'), true);
    });

    test("cancel changes cleans record", function () {
        post.cancelChanges();
        post.get('title', 'My changing post');
        equal(post.get('isDirty'), false);
    });
})();


module("Model mapping", withFakeAPI);
(function () {
    var
        userId = 301,
        postId = 301001,
        commentId = 301001001, //TODO add store reset & call beforeEach
        postTitle = 'My very first post',
        postTimestamp = '2013-04-15 11:53',
        comment = 'Great! I like it',
        user = ModelTest.User.load({
            id: userId,
            name: 'Bob'
        }),
        post = ModelTest.Post.load({
            id: postId,
            user_id: userId,
            title: postTitle,
            created_at: postTimestamp,
            comment_ids: [ commentId ]
        }),
        comment = ModelTest.Comment.load({
            id: commentId,
            post_id: postId,
            text: comment
        });

    test("url should match standard REST format", function () {
        equal(user.get('_url'), 'users/%@'.fmt(userId));
    });

    test("url should contain nested resource's parents paths, according to [follow] option", function () {
        equal(post.get('_url'), 'posts/%@'.fmt(postId));
        equal(comment.get('_url'), 'posts/%@/comments/%@'.fmt(postId, commentId));
    });
})();
