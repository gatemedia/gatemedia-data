/* global module, asyncTest, start,
          equal,
          ContextedApp:true */

ContextedApp = Ember.Application.create({
  rootElement: '#context-test',

  adapter: Data.Adapter.create({
    baseUrl: Global.api.url,
    authParams: {}
  })
});

ContextedApp.Stuff = Data.Model.extend({
  name: Data.attr('string'),
  state: Data.attr('string')
});


module("Context & cache management", {
  setup: function () {
    Data.API.reset();
  }
});
(function () {
  asyncTest("Cache can be bound to context, and kept through context changes", function () {
    var id = 42;

    Data.API.stub().GET('stuffs/%@'.fmt(id), {
      'stuff': {
        'id': id,
        'name': "Nice stuff",
        'state': "idle"
      }
    });

    Ember.run(function () {
      ContextedApp.adapter.setProperties({
        cachePerContext: true,
        clearCacheOnContextChange: false
      });

      ContextedApp.Stuff.find(id).then(function (idleStuff) {
        equal(Data.API.XHR_REQUESTS.length, 1, 'Stuffs index has been request once');
        equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'stuffs/%@'.fmt(id), 'Stuffs index has been requested without context');

        equal(idleStuff.get('state'), 'idle', 'Stuff state is "idle" in this context');

        ContextedApp.Stuff.find(id).then(function () {
          equal(Data.API.XHR_REQUESTS.length, 1, 'Stuffs index has not been request once more');

          ContextedApp.adapter.setContext('working');

          Data.API.stub().GET('working/stuffs/%@'.fmt(id), {
            'stuff': {
              'id': id,
              'name': "Nice stuff",
              'state': "busy"
            }
          });

          ContextedApp.Stuff.find(id).then(function (busyStuff) {
            equal(Data.API.XHR_REQUESTS.length, 2, 'Stuffs index has been request again');
            equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'working/stuffs/%@'.fmt(id), 'Stuffs index has been requested with context');

            equal(busyStuff.get('state'), 'busy', 'Stuff state is "busy" in this context');

            ContextedApp.adapter.resetContext();

            ContextedApp.Stuff.find(id).then(function (stillIdleStuff) {
              equal(Data.API.XHR_REQUESTS.length, 2, 'Stuffs index has still no more been requested');

              equal(stillIdleStuff.get('state'), 'idle', 'Stuff state is "idle" in this context');

              start();
            });
          });
        });
      });
    });
  });


  asyncTest("Cache can be bound to context, and cleared as context changes", function () {
    var id = 36;

    Data.API.stub().GET('stuffs/%@'.fmt(id), {
      'stuff': {
        'id': id,
        'name': "Nice stuff",
        'state': "idle"
      }
    });

    Ember.run(function () {
      ContextedApp.adapter.setProperties({
        cachePerContext: true,
        clearCacheOnContextChange: true
      });

      ContextedApp.Stuff.find(id).then(function (idleStuff) {
        equal(Data.API.XHR_REQUESTS.length, 1, 'Stuffs index has been request once');
        equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'stuffs/%@'.fmt(id), 'Stuffs index has been requested without context');

        equal(idleStuff.get('state'), 'idle', 'Stuff state is "idle" in this context');

        ContextedApp.Stuff.find(id).then(function () {
          equal(Data.API.XHR_REQUESTS.length, 1, 'Stuffs index has not been request once more');

          ContextedApp.adapter.setContext('working');

          Data.API.stub().GET('working/stuffs/%@'.fmt(id), {
            'stuff': {
              'id': id,
              'name': "Nice stuff",
              'state': "busy"
            }
          });

          ContextedApp.Stuff.find(id).then(function (busyStuff) {
            equal(Data.API.XHR_REQUESTS.length, 2, 'Stuffs index has been request again');
            equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'working/stuffs/%@'.fmt(id), 'Stuffs index has been requested with context');

            equal(busyStuff.get('state'), 'busy', 'Stuff state is "busy" in this context');

            ContextedApp.adapter.resetContext();

            Data.API.stub().GET('stuffs/%@'.fmt(id), {
              'stuff': {
                'id': id,
                'name': "Nice stuff",
                'state': "tired"
              }
            });

            ContextedApp.Stuff.find(id).then(function (stillIdleStuff) {
              equal(Data.API.XHR_REQUESTS.length, 3, 'Stuffs index has been requested once again');
              equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'stuffs/%@'.fmt(id), 'Stuffs index has been requested without context');

              equal(stillIdleStuff.get('state'), 'tired', 'Stuff state is "idle" in this context');

              start();
            });
          });
        });
      });
    });
  });


  asyncTest("Cache can be global, and last forever", function () {
    var id = 12;

    Data.API.stub().GET('stuffs/%@'.fmt(id), {
      'stuff': {
        'id': id,
        'name': "Nice stuff",
        'state': "idle"
      }
    });

    Ember.run(function () {
      ContextedApp.adapter.setProperties({
        cachePerContext: false,
        clearCacheOnContextChange: false
      });

      ContextedApp.Stuff.find(id).then(function (idleStuff) {
        equal(Data.API.XHR_REQUESTS.length, 1, 'Stuffs index has been request once');
        equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'stuffs/%@'.fmt(id), 'Stuffs index has been requested without context');

        equal(idleStuff.get('state'), 'idle', 'Stuff state is "idle" in this context');

        ContextedApp.Stuff.find(id).then(function () {
          equal(Data.API.XHR_REQUESTS.length, 1, 'Stuffs index has not been request once more');

          ContextedApp.adapter.setContext('working');

          ContextedApp.Stuff.find(id).then(function (busyStuff) {
            equal(Data.API.XHR_REQUESTS.length, 1, 'Stuffs index has not been request again');

            equal(busyStuff.get('state'), 'idle', 'Stuff state is "busy" in this context');
            equal(idleStuff.get('state'), 'idle', 'Previously retrieved Stuff state is now also "busy"');
            equal(busyStuff, idleStuff, 'Previously retrieved Stuff has been returned');

            ContextedApp.adapter.resetContext();

            ContextedApp.Stuff.find(id).then(function (stillIdleStuff) {
              equal(Data.API.XHR_REQUESTS.length, 1, 'Stuffs index has still no more been requested');

              equal(stillIdleStuff.get('state'), 'idle', 'Stuff state is "idle" in this context');
              equal(stillIdleStuff, idleStuff, 'Previously retrieved Stuff has been returned');

              start();
            });
          });
        });
      });
    });
  });


  asyncTest("Cache can be global, but cleared on context changes", function () {
    var id = 55;

    Data.API.stub().GET('stuffs/%@'.fmt(id), {
      'stuff': {
        'id': id,
        'name': "Nice stuff",
        'state': "idle"
      }
    });

    Ember.run(function () {
      ContextedApp.adapter.setProperties({
        cachePerContext: false,
        clearCacheOnContextChange: true
      });

      ContextedApp.Stuff.find(id).then(function (idleStuff) {
        equal(Data.API.XHR_REQUESTS.length, 1, 'Stuffs index has been request once');
        equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'stuffs/%@'.fmt(id), 'Stuffs index has been requested without context');

        equal(idleStuff.get('state'), 'idle', 'Stuff state is "idle" in this context');

        ContextedApp.Stuff.find(id).then(function () {
          equal(Data.API.XHR_REQUESTS.length, 1, 'Stuffs index has not been request once more');

          ContextedApp.adapter.setContext('working');

          Data.API.stub().GET('working/stuffs/%@'.fmt(id), {
            'stuff': {
              'id': id,
              'name': "Nice stuff",
              'state': "busy"
            }
          });

          ContextedApp.Stuff.find(id).then(function (busyStuff) {
            equal(Data.API.XHR_REQUESTS.length, 2, 'Stuffs index has been request again');
            equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'working/stuffs/%@'.fmt(id), 'Stuffs index has been requested with context');

            equal(busyStuff.get('state'), 'busy', 'Stuff state is "busy" in this context');

            ContextedApp.adapter.resetContext();

            Data.API.stub().GET('stuffs/%@'.fmt(id), {
              'stuff': {
                'id': id,
                'name': "Nice stuff",
                'state': "tired"
              }
            });

            ContextedApp.Stuff.find(id).then(function (stillIdleStuff) {
              equal(Data.API.XHR_REQUESTS.length, 3, 'Stuffs index has been requested again');
              equal(Data.API.XHR_REQUESTS.get('lastObject.url'), 'stuffs/%@'.fmt(id), 'Stuffs index has been requested without context');

              equal(stillIdleStuff.get('state'), 'tired', 'Stuff state is now "tired" in this context');

              start();
            });
          });
        });
      });
    });
  });
})();
