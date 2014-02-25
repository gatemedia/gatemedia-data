/* global module, asyncTest, start,
          equal, ok,
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


module("Partial loading");
(function () {

  asyncTest('API context is passed when defined', function () {
    var context = 'dummy';

    Data.API.stub(3).GET('stuffs', {
      'stuffs': []
    });
    Data.API.stub().GET('%@/stuffs'.fmt(context), {
      'stuffs': []
    });

    PartialLoading.Stuff.find().then(function (/*stuffs*/) {
      equal(Data.API.XHR_REQUESTS.length, 1, 'Stuffs index has been request once');
      equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'stuffs', 'Stuffs index has been without context as not set');

      Data.setContext(context);

      PartialLoading.Stuff.find().then(function (/*stuffs*/) {
        equal(Data.API.XHR_REQUESTS.length, 2, 'Stuffs index has been request once');
        equal(Data.API.XHR_REQUESTS.get('lastObject.url'), '%@/stuffs'.fmt(context), 'Stuffs index has been with context as set');

        PartialLoading.Stuff.find(null, null, { useContext: false }).then(function (/*stuffs*/) {
          equal(Data.API.XHR_REQUESTS.length, 3, 'Stuffs index has been request once');
          equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'stuffs', 'Stuffs index has been without context as specified');

          Data.resetContext();

          PartialLoading.Stuff.find().then(function (/*stuffs*/) {
            equal(Data.API.XHR_REQUESTS.length, 4, 'Stuffs index has been request once');
            equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'stuffs', 'Stuffs index has been without context as unset');

            start();
          });
        });
      });
    });

  });


    // var stuffId = 42;
    // Data.API.stub('forever').GET('stuffs/%@'.fmt(stuffId), {
    //   'stuff': {
    //     'id': stuffId,
    //     'name': "My stuff"
    //   }
    // });


})();
