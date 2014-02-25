/* global module, asyncTest, start, ok, equal, AdapterTest:true */

AdapterTest = Ember.Application.create({
  apiUrl: Global.apiUrl,
  rootElement: '#adapter-test',

  adapter: Data.Adapter.create({
    baseUrl: Global.api.url,
    authParams: {
      'user_credentials': Auth.user.singleAccessToken
    }
  })
});

AdapterTest.Entity = Data.Model.extend({
  name: Data.attr('string')
});

module("Adapter processing");
(function () {

  asyncTest("Empty body on write actions shouldn't break adapter", function () {
    Data.API.stub().POST('entities', {});
    Data.API.stub().GET('entities/42', { entity: { id: 42, name: 'hop la yo' } });
    Data.API.stub().PUT('entities/42', {});

    Ember.run(function () {
      var initialName = 'hop la yo',
          newEntity = AdapterTest.Entity.instanciate({
        name: initialName
      });

      newEntity.save().then(function (/*ignoredEntity*/) {
        return AdapterTest.Entity.find(42);
      }).then(function (entity) {
        equal(entity.get('name'), initialName, 'Retrieved name is correct');
        entity.set('name', 'yopla');
        return entity.save();
      }).then(function (savedEntity) {
        equal(savedEntity.get('name'), 'yopla', 'Updated name is correct');
        start();
      }, function (error) {
        ok(false, error);
      });
    });
  });

  asyncTest("HTTP errors should be handled by promise rejection", function () {
    Data.API.stub().POST('entities', null, null, 500);

    Ember.run(function () {
      var newEntity = AdapterTest.Entity.instanciate();

      newEntity.save().then(function (/*ignoredEntity*/) {
        ok(false, 'Should have brake');
        start();
      }, function (error) {
        ok(true, error);
        start();
      });
    });
  });
})();
