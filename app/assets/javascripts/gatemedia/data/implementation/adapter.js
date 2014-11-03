
Data.Adapter = Ember.Object.extend({

  baseUrl: Ember.required(),
  namespace: null,
  context: null,
  /**
    To be defined as needed by app.
   */
  authParams: null,

  cachePerContext: true,
  clearCacheOnContextChange: false,

  setNamespace: function (namespace) {
    this.set('namespace', namespace);
  },
  resetNamespace: function () {
    this.setNamespace(null);
  },

  setContext: function (context) {
    this.set('context', context);
  },
  resetContext: function () {
    this.setContext(null);
  },

  GET: function (url, data) {
    var settings = {
      type: 'GET',
      url: this._contextifiedUrl(url),
      data: this.buildParams(data)
    };
    return this._promisifiedAjax(settings);
  },

  POST: function (url, data) {
    return this._jsonBasedAjax('POST', url, data);
  },
  PUT: function (url, data) {
    return this._jsonBasedAjax('PUT', url, data);
  },
  DELETE: function (url, data) {
    return this._jsonBasedAjax('DELETE', url, data);
  },

  _jsonBasedAjax: function (action, url, data) {
    var settings = {
      type: action,
      url: this._contextifiedUrl(url),
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify(this.buildParams(data))
    };
    return this._promisifiedAjax(settings);
  },

  _contextifiedUrl: function (url) {
    var parts = [],
        namespace = this.get('namespace'),
        context = this.get('context');

    parts.pushObject(this.get('baseUrl'));
    if (namespace) {
      parts.pushObject(namespace);
    }
    if (!Ember.isNone(context)) {
      parts.pushObject(context);
    }
    parts.pushObject(url);
    return parts.join('/');
  },

  _promisifiedAjax: function (settings) {
    var self = this;
    return new Ember.RSVP.Promise(function (resolve, reject) {
      self._xhr(
        settings,
        function (data) {
          resolve(data);
        },
        function (xhr, status, error) {
          Ember.run(function () {
            self.xhrError(settings, xhr, status, error);
            reject({
              xhr: xhr,
              status: status,
              error: error
            });
          });
        });
    });
  },

  _xhr: function (settings, success, error) {
    if (!settings.async) {
      settings = Ember.merge(settings, {
        success: success,
        error: error
      });
    }

    var call = Data.ajax(settings);

    if (settings.async) {
      call
        .done(success)
        .fail(error);
    }
  },

  findOne: function (type, id, parent, options, hooks) {
    options = options || {};
    return this.findWithCache(options,
      function (ok) {
        var cached = type.cachedRecord(id);
        if (cached) {
          ok(cached);
          return true;
        }
        return false;
      },
      function (async, ok, ko) {
        var action = 'GET',
            useContext = Ember.isNone(options.useContext) ? true : options.useContext,
            url = this.buildUrl(type, id, parent, useContext),
            self = this,
            settings = {
          async: async,
          type: action,
          url: url,
          dataType: 'json',
          data: this.buildParams(options.params)
        };

        Ember.tryInvoke(hooks, 'willXHR', [url]);
        this._xhr(settings,
        function (data) {
          Ember.Logger.debug("DATA - Found one", type, "(" + id + "):", data);
          var resourceKey = type.resourceKey();

          if (data[resourceKey]) {
            Ember.tryInvoke(hooks, 'willLoad', [data]);
            var record = type.load(data[resourceKey]);
            type.sideLoad(data, resourceKey);
            Ember.tryInvoke(hooks, 'didLoad', [data]);
            ok(record);
          } else {
            var message = "API returned JSON with missing key '" + resourceKey + "'";

            Ember.Logger.error(message, data);
            ko({
              xhr: null,
              status: null,
              error: message
            });
          }
        },
        function (xhr, status, error) {
          self.xhrError(settings, xhr, status, error);
          ko({
            xhr: xhr,
            status: status,
            error: error
          });
        });
      }
    );
  },

  findMany: function (type, ids, parent, options, hooks) {
    options = options || {};
    return this.findWithCache(options,
      function (ok) {
        var cached = ids.map(function (id) {
          return type.cachedRecord(id);
        }).compact();

        if (!Ember.isEmpty(ids) && (cached.length === ids.length)) {
          ok(cached);
          return true;
        }
        return false;
      },
      function (async, ok, ko) {
        var self = this,
            action = 'GET',
            useContext = Ember.isNone(options.useContext) ? true : options.useContext,
            url = this.buildUrl(type, null, parent, useContext),
            settings = {
          async: async,
          type: action,
          url: url,
          dataType: 'json',
          data: this.buildParams(options.params, {
            ids: ids, // Ember.isEmpty(ids) ? null : ids,
          })
        };

        Ember.tryInvoke(hooks, 'willXHR', [url]);
        this._xhr(settings,
        function (data) {
          Ember.Logger.debug("DATA - Found many", type, (parent ? "(parent " + parent.toString() + ")" : '') + ":", data);
          var resourceKey = type.resourceKey().pluralize(),
              result = [];

          if (data[resourceKey]) {
            Ember.tryInvoke(hooks, 'willLoad', [data]);
            result.addObjects(data[resourceKey].map(function (itemData) {
              return type.load(itemData);
            }));
            type.sideLoad(data, resourceKey);
            Ember.tryInvoke(hooks, 'didLoad', [data]);
            ok(result);
          } else {
            var message = "API returned JSON with missing key '" + resourceKey + "'";

            Ember.Logger.error(message, data);
            ko({
              xhr: null,
              status: null,
              error: message
            });
          }
        },
        function (xhr, status, error) {
          self.xhrError(settings, xhr, status, error);
          ko({
            xhr: xhr,
            status: status,
            error: error
          });
        });
      });
  },

  findWithCache: function (options, findInCache, find) {
    options = options || {};

    var adapter = this,
        async = !options.sync,
        noCache = options.noCache;

    function run (async, noCache, resolve, reject) {
      var result = null;

      function ok (record) {
        Ember.run(function () {
          if (async) {
            resolve(record);
          } else {
            result = record;
          }
        });
      }

      function ko (error) {
        Ember.run(function () {
          if (async) {
            reject(error);
          } else {
            result = null;
          }
        });
      }

      if (noCache || !findInCache.call(adapter, ok)) {
        find.call(adapter, async, ok, ko);
      }
      return result;
    }

    if (async) {
      return new Ember.RSVP.Promise(function (resolve, reject) {
        run(true, noCache, resolve, reject);
      });
    } else {
      return run(false, noCache);
    }
  },

  save: function (record, extraParams, includeProperties) {
    var adapter = this,
        action,
        async = true,
        params = {},
        resourceKey = record.constructor.resourceKey(),
        url = [
      this.get('baseUrl'),
      this.get('namespace'),
      this.get('context'),
      record.get('_url')
    ].compact().join('/');

    return new Ember.RSVP.Promise(function (resolve, reject) {
      Ember.run(adapter, function () {
        if (!(record.get('meta.isDirty') || record.get('meta.isNew'))) {
          Ember.Logger.warn('Do not save clean record: ' + record.toString());
          record.unload();
          resolve(record);
          return;
        }

        if (record.get('meta.isDeleted')) {
          action = 'DELETE';
        } else {
          params[resourceKey] = record.toJSON(includeProperties);

          if (record.get('meta.isNew')) {
            action = 'POST';
          } else {
            action = 'PUT';
          }
        }

        var settings = {
          async: async,
          type: action,
          url: url,
          // dataType: 'json', // avoid dataType, as it breaks when body is empty.
          contentType: 'application/json',
          data: JSON.stringify(adapter.buildParams(params, extraParams))
        };

        Data.ajax(settings).
        done(function (data) {
          Ember.run(function () {
            Ember.Logger.debug("DATA - Saved (" + action + ")",
              record.toString(), (parent ? "(parent " + parent.toString() + ")" : '') + ":", data);

            if (data && data[resourceKey]) {
              record.reloadFrom(data, resourceKey);
              resolve(record);
            } else {
              if (action === 'DELETE') {
                record.unload();
                resolve(record);
              } else {
                Ember.Logger.warn("API returned JSON with missing key '%@'".fmt(resourceKey), data);
                resolve(record);
              }
            }
          });
        }).
        fail(function (xhr, status, error) {
          Ember.run(function () {
            adapter.xhrError(settings, xhr, status, error);
            reject({
              xhr: xhr,
              status: status,
              error: error
            });
          });
        });
      });
    });
  },

  buildUrl: function (type, id, parent, useContext) {
    var namespace = this.get('namespace'),
        context = this.get('context'),
        urlParts = [
      this.get('baseUrl')
    ];

    if (namespace) {
      urlParts.pushObject(namespace);
    }
    if (context && useContext) {
      urlParts.pushObject(context);
    }
    if (parent) {
      urlParts.pushObject(parent.get('_url'));
    }
    urlParts.pushObject(type.resourceUrl());
    if (!Ember.isNone(id)) {
      urlParts.pushObject(id);
    }
    return urlParts.join('/');
  },

  buildParams: function (optionParams, extraParams) {
    var params = {};
    Ember.merge(params, this.get('authParams'));

    if (optionParams) {
      Ember.merge(params, optionParams);
    }
    if (extraParams) {
      Ember.merge(params, extraParams);
    }
    return params;
  },

  cacheFor: function (type) {
    var context = this.get('context') || '_global_',
        cachePerContext = this.get('cachePerContext'),
        key = type.toString(),
        cacheHolder, cache;

    this._cache = this._cache || {};
    if (cachePerContext) {
      this._cache[context] = this._cache[context] || {};
      cacheHolder = this._cache[context];
    } else {
      cacheHolder = this._cache;
    }

    cache = cacheHolder[key];
    if (Ember.isNone(cache)) {
      cache = {};
      cacheHolder[key] = cache;
    }
    return cache;
  },
  clearCacheAsContextChanged: function () {
    var lastContext = this.get('_lastContext'),
        newContext = this.get('context');

    if (newContext) {
      if ((newContext !== lastContext) &&
          this.get('clearCacheOnContextChange')) {
        this.set('_cache', {});
      }
      this.set('_lastContext', newContext);
    }
  }.observes('context'),


  xhrError: function (settings, xhr, status, error) {
    Data.trigger('xhr:error', xhr, status, error);
  }
});
