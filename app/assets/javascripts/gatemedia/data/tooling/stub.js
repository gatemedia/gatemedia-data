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
    handleCount: null,

    doneHandler: null,
    failHandler: null,

    match: function (settings) {
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
             paramsMatch &&
             (this.get('handleCount') > 0);
    },

    _checkParams: function (expected, got) {
      var match = true;
      Ember.keys(expected).forEach(function (key) {
        if (Ember.typeOf(expected[key]) === 'object') {
          match = this._checkParams(expected[key], Ember.Object.create(got.get(key)));
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

      Ember.Logger.info('--> AJAX CALL', settings);

      function reply () {
        var result = this.get('result');

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

      this.decrementProperty('handleCount');
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
      var api = this,
          handleCount = count || 'once';

      if (Ember.typeOf(handleCount) === 'string') {
        switch (handleCount) {
        case 'once':
          handleCount = 1;
          break;
        case 'forever':
          handleCount = 100;
          break;
        }
      }

      function registerHandler (verb, path, params, result, assertionsCallback) {
        if (Ember.isNone(result)) {
          result = params;
          params = null;
        }
        api.get('handlers').pushObject(RequestHandler.create({
          verb: verb,
          path: path,
          params: params,
          result: result,
          handleCount: handleCount,
          assertionsCallback: assertionsCallback
        }));
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

    reset: function () {
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

})();

QUnit.moduleDone(function (/*details*/) {
  Data.API.reset();
});
