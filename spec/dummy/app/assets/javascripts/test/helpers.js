//= require lib/sinon-1.6.0
//= require lib/sinon-server-1.6.0

/* global ok:false, withFakeAdapter:true */

Data.FakeAdapter = Data.Adapter.extend({
  XHR_FIXTURES: null,
  XHR_REQUESTS: null,

  reset: function () {
    this.set('XHR_FIXTURES', []);
    this.set('XHR_REQUESTS', []);
  },

  ajax: function (settings) {
    if (Ember.isNone(this.get('XHR_REQUESTS'))) {
      ok(false, 'FakeAdapter not setup. Did you specified "withFakeAdapter(...)"?');
    }

    var method = settings.type,
        url = /https?:\/\/(.+?)(:\d+)?\/(.*)/.exec(settings.url).get('lastObject'),
        params = settings.data;

    if (method === 'GET') {
      var extra = [];
      Ember.keys(params).forEach(function (param) {
        if (params.hasOwnProperty(param)) {
          var value = params[param];
          if (Ember.typeOf(value) === 'array') {
            value.forEach(function (item) {
              extra.pushObject('%@[]=%@'.fmt(param, item));
            });
          } else {
            extra.pushObject('%@=%@'.fmt(param, value));
          }
        }
      });
      if (extra.length > 0) {
        url += '?' + extra.map(function (p) { return encodeURI(p); }).join('&');
      }
    }

    this.get('XHR_REQUESTS').pushObject({
      method: method,
      url: url,
      params: params,
      raw: settings
    });
    Ember.Logger.debug('AJAX ->', method, url, params);

    var fixture = this.get('XHR_FIXTURES').find(function (fixture) {
      return (fixture.method === method) && (fixture.url === url);
    });

    if (Ember.isNone(fixture)) {
      var message = 'Unexpected XHR call: %@ %@'.fmt(method, url);
      Ember.Logger.error(message);
      ok(false, message);

      fixture = { data: null };
    }

    if (fixture.status === 200) {
      if (settings.hasOwnProperty('success')) {
        settings.success(fixture.data);
      }
    } else {
      if (settings.hasOwnProperty('error')) {
        settings.error({}, fixture.status, 'BAM');
      }
    }
    return {
      //TODO
    };
  },

  fakeXHR: function (method, url, params, data, status) {
    if (Ember.isNone(this.get('XHR_FIXTURES'))) {
      ok(false, 'FakeAdapter not setup. Did you specified "withFakeAdapter(...)" at test module declaration?');
    }

    status = status || 200;

    if (Ember.isNone(data)) {
      data = params;
      params = null;
    }

    Ember.Logger.debug('AJAX STUB:', method, url, params, data);
    this.get('XHR_FIXTURES').pushObject({
      method: method,
      url: url,
      params: params,
      data: data,
      status: status
    });
  }
});


withFakeAdapter = function (adapter) {
  return {
    setup: function () {
      adapter.reset();
    },
    teardown: function () {
    }
  };
};
