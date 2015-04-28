import Ember from 'ember';
import { module, test } from 'qunit';
import Adapter from 'gatemedia-data/utils/adapter';
import startApp from '../../helpers/start-app';

module('adapter', {

  beforeEach: function () {
    this.app = startApp();
  },
  afterEach: function () {
    Ember.run(this.app, this.app.destroy);
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

test('authParams are added when set', function (assert) {
  var adapter = Adapter.create({
    baseUrl: 'https://api.com',
    namespace: 'api/v2'
  });

  assert.deepEqual(adapter.buildParams(), {}, 'No auth parameters are passed when not set');

  var key = 'Afevrt34Tagzrv';
  adapter.set('authParams', {
    'user_credentials': key
  });
  assert.deepEqual(adapter.buildParams(), {
    'user_credentials': key
  }, 'Auth parameters are passed when set');

  adapter.set('authParams', {
    'user_credentials': key,
    'extra': 'bam'
  });
  assert.deepEqual(adapter.buildParams(), {
    'user_credentials': key,
    'extra': 'bam'
  }, 'Auth parameters are passed when set');

  var key2 = 'AZav34Ttgé"r547';
  adapter.set('authParams', {
    'user_credentials': key2
  });
  assert.deepEqual(adapter.buildParams(), {
    'user_credentials': key2
  }, 'Auth parameters are passed when set');

  adapter.set('authParams', null);
  assert.deepEqual(adapter.buildParams(), {}, 'Auth parameters are passed when set');
});

test('authParams can be properties on an object', function (assert) {
  var adapter = Adapter.create({
    baseUrl: 'https://api.com',
    namespace: 'api/v2'
  });

  assert.deepEqual(adapter.buildParams(), {}, 'No auth parameters are passed when not set');

  var params = Ember.Object.extend({
    token: null,
    'user_credentials': Ember.computed('token', function () {
      return this.get('token');
    })
  }).create();
  adapter.set('authParams', params);

  assert.deepEqual(adapter.buildParams(), {
    'user_credentials': null
  }, 'Auth parameters are set from properties value');

  var key = 'Afevrt34Tagzrv';
  params.set('token', key);
  assert.deepEqual(adapter.buildParams(), {
    'user_credentials': key
  }, 'Auth parameters are altered when properties evolves');

  var key2 = 'Erhsqqst2346Yrg';
  params.set('token', key2);
  assert.deepEqual(adapter.buildParams(), {
    'user_credentials': key2
  }, 'Auth parameters are altered when properties evolves');
});
