import Ember from 'ember';
import Store from 'gatemedia-data/utils/store';
import Adapter from 'gatemedia-data/utils/adapter';

export function initialize (registry, application) {

  var adapter = Adapter.create({
    baseUrl: 'dummy.com',
    namespace: 'v2',
    cachePerContext: true,
    clearCacheOnContextChange: true
  }),
      store = Store.create({
    container: null,
    adapter: adapter
  });

  adapter.on('xhr:error', function (xhr, status, error) {
    Ember.Logger.error('BAM:', status, error, xhr);
  });

  application.register('store:main', store, { instantiate: false });

  application.inject('route', 'store', 'store:main');
  application.inject('controller', 'store', 'store:main');

  application.register('adapter:main', adapter, { instantiate: false });

  application.inject('route', 'adapter', 'adapter:main');
  application.inject('controller', 'adapter', 'adapter:main');
}

export default {
  name: 'data',
  initialize: initialize
};
