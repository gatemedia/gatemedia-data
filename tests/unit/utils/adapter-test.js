import Ember from 'ember';
import { module, test } from 'qunit';
import Adapter from 'gatemedia-data/utils/adapter';
import startApp from '../../helpers/start-app';

module('Adapter', {
  setup: function () {
    startApp();
  }
});

test('buildUrl', function (assert) {
  var adapter = Adapter.create({
    baseUrl: 'https://api.com',
    namespace: 'api/v2'
  });

  adapter.setContext('somewhere');
  assert.equal(adapter.buildUrl('client', null, null, false), 'https://api.com/api/v2/clients',
    'Resource index URL is correct');
  assert.equal(adapter.buildUrl('client', null, null, true), 'https://api.com/api/v2/somewhere/clients',
    'Resource index URL is correct with context');
  assert.equal(adapter.buildUrl('client', 42, null, true), 'https://api.com/api/v2/somewhere/clients/42',
    'Resource item URL is correct');
  assert.equal(adapter.buildUrl('client', 42, Ember.Object.create({ _url: 'parent/res' }), true),
    'https://api.com/api/v2/somewhere/parent/res/clients/42',
    'Resource item URL supports parent prefix');
});
