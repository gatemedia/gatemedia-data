/* global module:false, asyncTest:false, start:false, ok:false, equal:false, withFakeAdapter:false, AdapterTest:true */

AdapterTest = Ember.Application.create({
  apiUrl: Global.apiUrl,
  rootElement: '#' + $('<div id="adapter-test">').appendTo('body').attr('id'),

  adapter: Data.FakeAdapter.create({
    baseUrl: Global.apiUrl,
    authParams: {}
  })
});

AdapterTest.Entity = Data.Model.extend({
  name: Data.attr('string')
});

module("Adapter processing", withFakeAdapter(AdapterTest.adapter));
(function () {

  asyncTest("Empty body on write actions shouldn't break adapter", function () {
    AdapterTest.adapter.fakeXHR('POST', 'entities', {});
    AdapterTest.adapter.fakeXHR('GET', 'entities/42', { entity: { id: 42, name: 'hop la yo' } });
    AdapterTest.adapter.fakeXHR('PUT', 'entities/42', {});

    Ember.run(function () {
      var newEntity = AdapterTest.Entity.instanciate(),
          initialName = 'hop la yo';

      newEntity.set('name', initialName);
      newEntity.save().then(function (/*ignoredEntity*/) {

        AdapterTest.Entity.find(42).then(function (entity) {
          equal(entity.get('name'), initialName);

          entity.set('name', 'yopla');

          entity.save().then(function (savedEntity) {
            equal(savedEntity.get('name'), 'yopla');
            start();
          }, function (error) {
            ok(false, error);
          });
        });
      });
    });
  });
})();
