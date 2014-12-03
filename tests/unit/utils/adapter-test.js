import Adapter from 'gatemedia-data/utils/adapter';

module('Adapter');

test('buildUrl', function () {
  var adapter = Adapter.create({
    baseUrl: 'https://api.com',
    namespace: 'api/v2'
  });

  adapter.setContext('somewhere');
  equal(adapter.buildUrl('client', null, null, false), 'https://api.com/api/v2/clients',
    'Resource index URL is correct');
  equal(adapter.buildUrl('client', null, null, true), 'https://api.com/api/v2/somewhere/clients',
    'Resource index URL is correct with context');
  equal(adapter.buildUrl('client', 42, null, true), 'https://api.com/api/v2/somewhere/clients/42',
    'Resource item URL is correct');
  equal(adapter.buildUrl('client', 42, Ember.Object.create({ _url: 'parent/res' }), true),
    'https://api.com/api/v2/somewhere/parent/res/clients/42',
    'Resource item URL supports parent prefix');
});
