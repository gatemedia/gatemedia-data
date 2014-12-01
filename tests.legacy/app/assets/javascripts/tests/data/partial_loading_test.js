/* global module, asyncTest, start,
          equal,
          PartialLoading:true */

PartialLoading = Ember.Application.create({
  rootElement: '#partial-loading-test',

  adapter: Data.Adapter.create({
    baseUrl: Global.api.url,
    authParams: {
      // 'user_credentials': Auth.user.singleAccessToken
    }
  })
});

PartialLoading.Stuff = Data.Model.extend({
  name: Data.attr('string'),
  description: Data.attr('string'),
  parts: Data.hasMany('PartialLoading.Part')
});

PartialLoading.Part = Data.Model.extend({
  label: Data.attr('string')
});


PartialLoading.User = Data.Model.extend({
  login: Data.attr('string'),
  password: Data.attr('string', { defaultUndefined: true, defaultValue: null })
});


module("Partial loading", {
  setup: function () {
    Data.API.reset();
  }
});
(function () {

  asyncTest('API context is passed when defined', 8, function () {
    var context = 'dummy';

    Data.API.stub(3).GET('stuffs', {
      'stuffs': []
    });
    Data.API.stub().GET('%@/stuffs'.fmt(context), {
      'stuffs': []
    });

    PartialLoading.Stuff.find().then(function (/*stuffs*/) {
      equal(Data.API.XHR_REQUESTS.length, 1, 'Stuffs index has been request once');
      equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'stuffs', 'Stuffs index has been requested without context, as not set');

      PartialLoading.adapter.setContext(context);

      PartialLoading.Stuff.find().then(function (/*stuffs*/) {
        equal(Data.API.XHR_REQUESTS.length, 2, 'Stuffs index has been request once');
        equal(Data.API.XHR_REQUESTS.get('lastObject.url'), '%@/stuffs'.fmt(context), 'Stuffs idx has been requested with context, as set');

        PartialLoading.Stuff.find(null, null, { useContext: false }).then(function (/*stuffs*/) {
          equal(Data.API.XHR_REQUESTS.length, 3, 'Stuffs index has been request once');
          equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'stuffs', 'Stuffs index has been requested without context, as specified');

          PartialLoading.adapter.resetContext();

          PartialLoading.Stuff.find().then(function (/*stuffs*/) {
            equal(Data.API.XHR_REQUESTS.length, 4, 'Stuffs index has been request once');
            equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'stuffs', 'Stuffs index has been requested without context, as unset');

            start();
          });
        });
      });
    });

  });


  asyncTest('Missing attribute access causes full resource retrieval', 4, function () {
    var context = 'dummy',
        stuffId = 42;

    PartialLoading.adapter.setContext(context);
    Data.API.stub().GET('%@/stuffs/%@'.fmt(context, stuffId), {
      'stuff': {
        'id': stuffId,
        'name': "My stuff"
      }
    });
    Data.API.stub().GET('%@/stuffs/%@'.fmt(context, stuffId), {
      'stuff': {
        'id': stuffId,
        'name': "My stuff",
        'description': "What a nice stuff!"
      }
    });

    PartialLoading.Stuff.find(stuffId).then(function (stuff) {
      equal(stuff.get('name'), 'My stuff', 'Name attribute is defined');
      equal(Data.API.XHR_REQUESTS.length, 1, 'Stuff has been retrieved once');
      equal(stuff.get('description'), 'What a nice stuff!', 'Description attribute is defined');
      equal(Data.API.XHR_REQUESTS.length, 2, 'Stuff has been retrieved twice');

      start();
    });
  });


  asyncTest('Pasword attribute case', 4, function () {
    var userId = 42;

    PartialLoading.adapter.resetContext();
    Data.API.stub().GET('users/%@'.fmt(userId), {
      'user': {
        'id': userId,
        'login': "User 42"
      }
    });
    Data.API.stub().PUT('users/%@'.fmt(userId), {
      'user': {
        'login': "User 42",
        'password': "varnvzaze54"
      }
    }, {
      'user': {}
    });

    PartialLoading.User.find(userId).then(function (user) {
      equal(user.get('login'), 'User 42', 'Login attribute is defined');
      equal(Data.API.XHR_REQUESTS.length, 1, 'User has been retrieved once');
      equal(user.get('password'), null, 'Password attribute returns default value when undefined');
      equal(Data.API.XHR_REQUESTS.length, 1, 'User has been retrieved once, still');

      user.set('password', 'varnvzaze54');
      user.save().then(function () {
        start();
      });
    });
  });

})();
