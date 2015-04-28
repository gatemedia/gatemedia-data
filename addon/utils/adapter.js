import Ember from 'ember';

Ember.$.support.cors = true;

export default Ember.Object.extend(
  Ember.Evented,
{
  baseUrl: null, //required
  namespace: null,
  context: null,
  authParams: null,
  passXHRCredentials: false,

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

  GET: function (url, data, sync) {
    var settings = {
      type: 'GET',
      url: this._contextifiedUrl(url),
      data: this.buildParams(data),
      sync: Ember.isNone(sync) ? false : sync
    };
    return this._promisifiedAjax(settings);
  },

  POST: function (url, data, sync) {
    return this._jsonBasedAjax('POST', url, data, sync);
  },
  PUT: function (url, data, sync) {
    return this._jsonBasedAjax('PUT', url, data, sync);
  },
  DELETE: function (url, data, sync) {
    return this._jsonBasedAjax('DELETE', url, data, sync);
  },

  _jsonBasedAjax: function (action, url, data, sync) {
    var settings = {
      type: action,
      url: this._contextifiedUrl(url),
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify(this.buildParams(data)),
      sync: Ember.isNone(sync) ? false : sync
    };
    return this._promisifiedAjax(settings);
  },

  _contextifiedUrl: function (url) {
    var parts = Ember.A(),
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

    var call = this.ajax(settings);

    if (settings.async) {
      call
        .done(success)
        .fail(error);
    }
  },

  find: function (model, query, result) {
    var useContext = Ember.isNone(query.options.useContext) ? true : query.options.useContext,
        url = this.buildUrl(
          model.key,
          query.findMany ? null : model.ids,
          model.parent,
          useContext),
        settings = {
      async: query.async,
      type: 'GET',
      url: url,
      dataType: 'json',
      data: this.buildParams(query.options.params, query.findMany ? {
        ids: model.ids, // Ember.isEmpty(ids) ? null : ids,
      } : null)
    };

    Ember.tryInvoke(result.hooks, 'willXHR', [url]);
    this._xhr(settings,

    function (data) {
      var resourceKey = model.key;
      if (query.findMany) {
        resourceKey = resourceKey.pluralize();
        Ember.Logger.debug(Ember.String.fmt('DATA - Got many %@%@:',
          resourceKey.dasherize(), model.parent ? ' (parent ' + model.parent.toString() + ')' : ''), Ember.copy(data));
      } else {
        Ember.Logger.debug(Ember.String.fmt('DATA - Got one %@%@:',
          resourceKey.dasherize(), query.ids ? ' (' + query.ids + ')' : ''), Ember.copy(data));
      }

      if (Ember.isNone(data[resourceKey])) {
        var message = "API returned JSON with missing key '" + resourceKey + "'";

        Ember.Logger.error(message, data);
        result.ko({
          xhr: null,
          status: null,
          error: message
        });
      } else {
        Ember.tryInvoke(query.hooks, 'willLoad', [data]);
        var got;
        if (query.findMany) {
          got = result.store.loadMany(model.key, data);
        } else {
          got = result.store.load(model.key, data);
        }
        Ember.tryInvoke(query.hooks, 'didLoad', [data]);
        result.ok(got);
      }
    },
    function (xhr, status, error) {
      this.xhrError(settings, xhr, status, error);
      result.ko({
        xhr: xhr,
        status: status,
        error: error
      });
    }.bind(this));
  },

  save: function (record, extraParams, includeProperties) {
    var adapter = this,
        action,
        async = true,
        params = {},
        resourceKey = record.get('meta.resourceKey'),
        url = Ember.A([
      this.get('baseUrl'),
      this.get('namespace'),
      this.get('context'),
      record.get('_url')
    ]).compact().join('/');

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
          dataType: 'json',
          contentType: 'application/json',
          data: JSON.stringify(adapter.buildParams(params, extraParams))
        };

        this.ajax(settings).
        done(function (data) {
          Ember.run(function () {
            Ember.Logger.debug("DATA - Saved (" + action + ")",
              record.toString(), ":", data);

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

  buildUrl: function (key, id, parent, useContext) {
    var namespace = this.get('namespace'),
        context = this.get('context'),
        urlParts = Ember.A([
      this.get('baseUrl')
    ]);

    if (namespace) {
      urlParts.pushObject(namespace);
    }
    if (context && useContext) {
      urlParts.pushObject(context);
    }
    if (parent) {
      urlParts.pushObject(parent.get('_url'));
    }
    urlParts.pushObject(Ember.String.pluralize(key));
    if (!Ember.isNone(id)) {
      urlParts.pushObject(id);
    }
    return urlParts.join('/');
  },

  buildParams: function (optionParams, extraParams) {
    var params = {};

    if (optionParams) {
      Ember.merge(params, optionParams);
    }
    if (extraParams) {
      Ember.merge(params, extraParams);
    }

    var authParams = this.get('authParams');
    if (authParams) {
      if (Ember.Object.detectInstance(authParams)) {
        authParams = authParams.get('authParams');
        if (Ember.isNone(authParams)) {
          Ember.Logger.warn('authParams is an object but is missing "authParams" property');
        }
      }
      Ember.merge(params, authParams);
    }

    return params;
  },

  xhrError: function (settings, xhr, status, error) {
    Ember.Logger.error('XHR Failed:', xhr.type, xhr.url, '->', status, error);
    this.trigger('xhr:error', xhr, status, error);
  },

  ajax: function (settings) {
    var extraSettings = {};

    if (this.get('passXHRCredentials')) {
      Ember.merge(extraSettings, {
        xhrFields: {
          withCredentials: true
        }
      });
    }
    return Ember.$.ajax(Ember.merge(settings, extraSettings));
  },
});
