/* global QUnit, ok */

(function () {

  function extractURL (fullUrl) {
    return (/http(s?):\/\/(.+?)\/(.+)/).exec(fullUrl).get('lastObject');
  }


  var RequestHandler = Ember.Object.extend({
    verb: null,
    path: null,
    params: null,
    result: null,
    assertionsCallback: null,
    consumed: false,

    doneHandler: null,
    failHandler: null,

    match: function (settings) {
      if (this.get('consumed')) {
        return false;
      }

      var requestPath = extractURL(settings.url),
          expectedParams = this.get('params'),
          paramsMatch = true;

      if (expectedParams) {
        var data = settings.data;
        if (Ember.typeOf(settings.data) === 'string') {
          data = JSON.parse(settings.data);
        }
        data = Ember.Object.create(data);


        paramsMatch = this._checkParams(expectedParams, data);
      }

      return (settings.type === this.get('verb')) &&
             (requestPath === this.get('path')) &&
             paramsMatch;
    },

    _checkParams: function (expected, got) {
      var match = true;
      Ember.keys(expected).forEach(function (key) {
        if (Ember.typeOf(expected[key]) === 'object') {
          var obj = got.get(key);
          if (Ember.typeOf(obj) === 'string') {
            obj = JSON.parse(obj);
          }
          match = this._checkParams(expected[key], Ember.Object.create(obj));
        } else {
          var v1 = got.get(key),
              v2 = expected[key],
              same;
          switch (Ember.typeOf(v1)) {
          case 'array':
            same = (Ember.compare(v1, v2) === 0);
            break;
          default:
            same = (v1 === v2);
          }
          if (!same) {
            match = false;
          }
        }
      }, this);
      return match;
    },

    handleRequest: function (settings, defaultLatency) {
      var assertionsCallback = this.get('assertionsCallback'),
          latency = defaultLatency;

      if (assertionsCallback) {
        assertionsCallback(settings.url, JSON.parse(settings.data));
      }

      Ember.Logger.info('--> AJAX CALL' + (settings.async ? ' [ASYNC]' : ''), settings.type, settings.url, settings.data);

      function reply () {
        Ember.Logger.info('<-- AJAX REPLY', Ember.copy(this.get('result'), true), stubId(this));
        var result = Ember.copy(this.get('result'), true);

        if (Ember.typeOf(result) === 'number') {
          this.callFail(result);
        } else {
          this.callDone(result);
        }
      }

      if (settings.async) {
        Ember.run.later(this, reply, latency);
      } else {
        this.setProperties({
          doneHandler: settings.success,
          failHandler: settings.error
        });
        Ember.run(this, reply);
      }

      this.set('consumed', true);
      return this;
    },

    done: function (handler) {
      this.set('doneHandler', handler);
      return this;
    },
    fail: function (handler) {
      this.set('failHandler', handler);
      return this;
    },

    callDone: function (data) {
      this.get('doneHandler')(data);
    },
    callFail: function (error) {
      this.get('failHandler')({}, 'error', error);
    }
  });


  Data.API = Ember.Object.extend({
    handlers: null,
    defaultLatency: 100,
    XHR_REQUESTS: null,

    init: function () {
      this.reset();
    },

    stub: function (count) {
      var api = this;

      if (Ember.isNone(count)) {
        count = 1;
      }

      function registerHandler (verb, path, params, result, assertionsCallback) {
        if (Ember.isNone(result)) {
          result = params;
          params = null;
        }
        var fullPath = path,
            namespace = api.get('namespace');
        if (namespace) {
          fullPath = [
            namespace,
            path
          ].join('/');
        }

        for(var i = 0; i < count; ++i) {
          var stub = RequestHandler.create({
            verb: verb,
            path: fullPath,
            params: params,
            result: result,
            assertionsCallback: assertionsCallback
          });
          Ember.Logger.info('<-> READY FOR', verb, path, params ? JSON.stringify(params) : '-', stubId(stub));
          api.get('handlers').pushObject(stub);
        }
      }

      return {
        GET: function (path, params, result, assertionsCallback) {
          registerHandler('GET', path, params, result, assertionsCallback);
        },
        POST: function (path, params, result, assertionsCallback) {
          registerHandler('POST', path, params, result, assertionsCallback);
        },
        PUT: function (path, params, result, assertionsCallback) {
          registerHandler('PUT', path, params, result, assertionsCallback);
        },
        DELETE: function (path, params, result, assertionsCallback) {
          registerHandler('DELETE', path, params, result, assertionsCallback);
        }
      };
    },

    processAjax: function (settings) {
      this._storeXHR(settings);
      var handler = this.get('handlers').find(function (handler) {
        return handler.match(settings);
      }) || this.get('fallbackHandler');

      return handler.handleRequest(settings, this.get('defaultLatency'));
    },
    _storeXHR: function (settings) {
      this.get('XHR_REQUESTS').pushObject({
        method: settings.type,
        url: extractURL(settings.url),
        params: Ember.copy(settings.data)
      });
    },

    reset: function (properties) {
      if (properties) {
        this.setProperties(properties);
      }
      this.set('handlers', []);
      this.set('fallbackHandler', RequestHandler.extend({
        handleRequest: function (settings) {
          var message = 'Missing handler for XHR call: %@ %@ %@'.fmt(settings.type, settings.url, settings.data);

          ok(false, message);
          Ember.assert(message, false);
        }
      }).create());
      this.set('XHR_REQUESTS', []);
    }
  }).create();


  Data.ajax = function (settings) {
    return Data.API.processAjax(settings);
  };


  function stubId (stub) {
    return '(stub#%@)'.fmt((/\:(\w+)\>/).exec(stub.toString())[1]);
  }


  QUnit.testDone(function (details) {
    var notConsumed = Data.API.handlers.filterBy('consumed', false);
    if (!Ember.isEmpty(notConsumed)) {
      Ember.Logger.error('Some stubs were not consumed by [%@::%@]'.fmt(details.module, details.name));
      notConsumed.forEach(function (stub) {
        Ember.Logger.error(' %@ -> %@ %@ %@'.fmt(
          stubId(stub),
          stub.get('verb'), stub.get('path'), stub.get('params') || ''));
      });
    }
  });

  QUnit.moduleDone(function (/*details*/) {
    Data.API.reset();
  });
})();
