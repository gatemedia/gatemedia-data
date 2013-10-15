
Data.Adapter = Ember.Object.extend({

  baseUrl: Ember.required(),
  authParams: null,

  /**
    Intended to be overriden as needed.
   */
  ajax: function (settings) {
    return Data.ajax(settings);
  },

  findOne: function (type, id, parent, options) {
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
            url = this.buildUrl(type, id, parent);

        this.ajax({
          async: async,
          type: action,
          url: url,
          dataType: 'json',
          data: this.buildParams(options.params),
          success: function (data) {
            Ember.Logger.debug("DATA - Found one", type, "(" + id + "):", data);
            var resourceKey = type.resourceKey();

            if (data[resourceKey]) {
              var record = type.load(data[resourceKey]);
              type.sideLoad(data);
              ok(record);
            } else {
              var message = "API returned JSON with missing key '" + resourceKey + "'";
              Ember.Logger.error(message, data);
              ko(message);
            }
          },
          error: function (xhr, status, error) {
            Ember.Logger.error(status + ':', action, url, error);
            ko(error);
          }
        });
      }
    );
  },

  findMany: function (type, ids, parent, options) {
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
        var action = 'GET',
            url = this.buildUrl(type, null, parent);

        this.ajax({
          async: async,
          type: action,
          url: url,
          dataType: 'json',
          data: this.buildParams(options.params, {
            ids: ids, // Ember.isEmpty(ids) ? null : ids,
          }),
          success: function (data) {
            Ember.Logger.debug("DATA - Found many", type, (parent ? "(parent " + parent.toString() + ")" : '') + ":", data);
            var resourceKey = type.resourceKey().pluralize(),
                result = [];

            if (data[resourceKey]) {
              result.addObjects(data[resourceKey].map(function (itemData) {
                return type.load(itemData);
              }));
              type.sideLoad(data);
              ok(result);
            } else {
              Ember.Logger.error("API returned JSON with missing key '" + resourceKey + "'", data);
              ko();
            }
          },
          error: function (xhr, status, error) {
            Ember.Logger.error(status + ':', action, url, error);
            ko(error);
          }
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

  save: function (record, extraParams) {
    var adapter = this,
        url = [ adapter.get('baseUrl'), record.get('_url') ].join('/'),
        action,
        async = true,
        params = {},
        resourceKey = record.constructor.resourceKey();

    return new Ember.RSVP.Promise(function (resolve, reject) {
      Ember.run(adapter, function () {
        if (!(record.get('meta.isDirty') || record.get('meta.isNew'))) {
          Ember.Logger.warn('Do not save clean record: ' + record.toString());
          record.unload();
          resolve();
          return;
        }

        if (record.get('meta.isDeleted')) {
          action = 'DELETE';
        } else {
          params[resourceKey] = record;

          if (record.get('meta.isNew')) {
            action = 'POST';
          } else {
            action = 'PUT';
          }
        }

        this.ajax({
          async: async,
          type: action,
          url: url,
          // dataType: 'json',
          contentType: 'application/json',
          data: JSON.stringify(adapter.buildParams(params, extraParams)),
          success: function (data) {
            Ember.run(function () {
              Ember.Logger.debug("DATA - Saved (" + action + ")",
                record.toString(), (parent ? "(parent " + parent.toString() + ")" : '') + ":", data);

              if (data[resourceKey]) {
                record._updateData(data[resourceKey]);
                record.constructor.sideLoad(data);
                resolve(record);
              } else {
                if (action === 'DELETE') {
                  record.unload();
                  resolve(record);
                } else {
                  Ember.Logger.error("API returned JSON with missing key '" + resourceKey + "'", data);
                  reject();
                }
              }
            });
          },
          error: function (xhr, status, error) {
            Ember.run(function () {
              Ember.Logger.error(status + ':', action, url, error);
              reject(error);
            });
          }
        });
      });
    });
  },

  buildUrl: function (type, id, parent) {
    var urlParts = [
      this.get('baseUrl')
    ];

    if (parent) {
      urlParts.pushObject(parent.get('_url'));
    }
    urlParts.pushObject(type.resourceUrl());
    if (id) {
      urlParts.pushObject(id);
    }
    return urlParts.join('/');
  },

  buildParams: function (optionParams, extraParams) {
    var params = {};
    $.extend(params, this.get('authParams'));

    if (optionParams) {
      $.extend(params, optionParams);
    }
    if (extraParams) {
      $.extend(params, extraParams);
    }
    return params;
  },
});
