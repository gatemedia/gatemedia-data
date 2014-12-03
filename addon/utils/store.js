import Ember from 'ember';
import { getType } from 'gatemedia-data/utils/misc';

export default Ember.Object.extend({
  container: null,

  instanciate: function (key, data, extraData) {
    var record = this.createRecord(key, data, extraData);
    record.set('meta.isNew', true);
    Ember.run.next(record, function () {
      this._dirty();
    });
    return record;
  },

  load: function (key, data, extraData) {
    var useCache = extraData ? !extraData._embeddedContainer : true,
        cachedRecord = useCache ? this.cachedRecord(key, data.id) : null,
        record;

    if (cachedRecord) {
      cachedRecord._updateData(data);
      record = cachedRecord;
    } else {
      record = this.createRecord(key, data, extraData);
      record.set('meta.isNew', false);
    }
    record.resetCaches();

    return record;
  },

  loadMany: function (key, data, extraData) {
    data = data || [];
    return data.map(function (itemData) {
      return this.load(key, itemData, extraData);
    }, this);
  },

  createRecord: function (key, data, extraData) {
    data = data || {};
    extraData = extraData || {};
    var useCache = !extraData._embeddedContainer,
        model = this.modelFor(key),
        record = model.create({
      _data: data,
      _createdAt: new Date(),
    });

    record.setProperties(extraData);
    if (useCache) {
      Ember.assert('Missing record id', !Ember.isNone(data.id));

      var cache = this.cacheFor(key);
      cache[data.id] = record;
    }
    return record;
  },

  sideLoad: function (data, alreadyLoaded) {
    alreadyLoaded = alreadyLoaded || [];

    Ember.assert('You must call %@.sideLoad() with the initial key'.fmt(this.constructor), !Ember.isNone(alreadyLoaded));
    if (!Ember.isArray(alreadyLoaded)) {
      delete data[alreadyLoaded];
      alreadyLoaded = [alreadyLoaded];
    }

    var orderedKeys = [],
        types = {};

    orderedKeys.addKey = function (key, type) {
      key = key.decamelize();
      if (!this.contains(key) && !alreadyLoaded.contains(key)) {
        types[key] = type;
        this.pushObject(key);
      }
    };

    function addAllKeys (keys) {
      keys.forEach(function (key) {
        var typeName = key.singularize().camelize().classify();
        orderedKeys.addKey(key, typeName);
      });
    }

    this.eachRelation(function (relationName, meta) {
      var sideLoads;
      if (meta.options.sideLoad) {
        sideLoads = [ meta.options.sideLoad ];
      } else if (meta.options.sideLoads) {
        sideLoads = meta.options.sideLoads;
      } else {
        sideLoads = [];
      }

      addAllKeys(meta.options.dependsOn || []);
      orderedKeys.addKey(relationName, meta.type);
      addAllKeys(sideLoads);
    });

    orderedKeys.forEach(function (key) {
      var dataKey;
      if (data.hasOwnProperty(key)) {
        dataKey = key;
      }
      if (data.hasOwnProperty(key.pluralize())) {
        dataKey = key.pluralize();
      }
      if (dataKey) {
        var sideLoad = data[dataKey],
            type = getType(types[key]);
        Ember.Logger.debug('DATA - Sideload', sideLoad.length, type, "instances", sideLoad);
        sideLoad.forEach(function (sideItemData) {
          type.load(sideItemData);
        });
        delete data[dataKey];
      }
    }, this);

    if (Ember.keys(data).length) {
      orderedKeys.forEach(function (key) {
        var type = getType(types[key]);
        if (type && Ember.keys(data).length) {
          type.sideLoad(data, alreadyLoaded.pushObjects(orderedKeys));
        }
      }, this);
    }
  },

  /**
    Find model's instance(s), according to passed parameters:
      - id or ids or API parameters
      - parent
      - options

    # Call samples

    ## App.Stuff.find()
      Requested API's URL:
        "/stuffs"
      API's controller action called:
        StuffsController.index
      API's action parameters:
        {}

    ## App.Stuff.find(42)
      Requested API's URL:
        "/stuffs/42"
      API's controller action called:
        StuffsController.show
      API's action parameters:
        { id:42 }

    ## App.Stuff.find(42, <parent>) (with <parent>.id=36)
      Requested API's URL:
        "/<parent>s/<parent.id>/stuffs/42"
      API's controller action called:
        StuffsController.show
      API's action parameters:
        { id:42, <parent>_id:36 }

    ## App.Stuff.find(42, null, {<options>})
      Requested API's URL:
        "/stuffs/42"
      API's controller action called:
        StuffsController.show
      API's action parameters:
        { id:42, <options.params> }

    ## App.Stuff.find(42, <parent>, {<options>})
      Requested API's URL:
        "/<parent>s/<parent.id>/stuffs/42"
      API's controller action called:
        StuffsController.show
      API's action parameters:
        { id:42, <parent>_id:36, <options.params> }

    ## App.Stuff.find([ 42, 51, 73 ], ...)
      Requested API's URL:
        "/<parent>s/<parent.id>/stuffs"
      API's controller action called:
        StuffsController.index
      API's action parameters:
        { ids:[42,51,73], ... }

    ## App.Stuff.find({ criteria: 'value' })
      Requested API's URL:
        "/stuffs"
      API's controller action called:
        StuffsController.index
      API's action parameters:
        { criteria: "value" }

    ## App.Stuff.find({ criteria: 'value' }, <parent>) (with <parent>.id=36)
      Requested API's URL:
        "/<parent>s/<parent.id>/stuffs"
      API's controller action called:
        StuffsController.index
      API's action parameters:
        {<parent>_id:36,criteria:"value"}

    # Supported options:
      - params: API call's extra parameters
      - sync: boolean (defaults to `false`) If true, return synchronously, otherwise return a promise
      - noCache: boolean (defaults to `false`) If true, ignore already loaded records (leads to cache update if incoming changes)
   */
  find: function (key, id, parent, options, hooks) {
    options = options || {};
    var findMany = true,
        ids;

    switch (Ember.typeOf(id)) {
    case 'string':
    case 'number':
      ids = id;
      findMany = false;
      break;
    case 'array':
      ids = id;
      break;
    case 'object':
      ids = [];
      options = Ember.merge({ params: id }, options);
      break;
    default:
      ids = [];
    }

    var foundInCache = false,
        cached;

    if (findMany) {
      cached = ids.map(function (id) {
        return this.cachedRecord(key, id);
      }.bind(this)).compact();
      foundInCache = !Ember.isEmpty(ids) && (cached.length === ids.length);
    } else {
      cached = this.cachedRecord(key, id);
      foundInCache = !Ember.isNone(cached);
    }

    var async = !options.sync;

    if (async) {
      return new Ember.RSVP.Promise(function (resolve, reject) {
        run.call(this, resolve, reject);
      }.bind(this));
    } else {
      return run.call(this);
    }

    function run (resolve, reject) {
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

      if (!options.noCache && foundInCache) {
        ok(cached);
      } else {
        Ember.assert('Store is missing its adapter', !Ember.isNone(this.adapter));
        this.adapter.find(
          { key: key, ids: ids, parent: parent },
          { options: options, findMany: findMany, async: async, hooks: hooks },
          { ok: ok, ko: ko, store: this });
      }
      return result;
    }
  },

  /**
    Return all loaded records (in cache), without issuing any request to the API.

    Beware, the result is not bound to the cache so it will reflect the cache state at call time.
   */
  all: function (model) {
    var cache = this.cacheFor(model);
    return Ember.keys(cache).map(function (id) { return cache[id]; });
  },

  cachedRecord: function (model, id) {
    var cache = this.cacheFor(model);
    return cache[id];
  },


  modelFor: function (key) {
    Ember.assert('Data store is missing its container', !Ember.isNone(this.container));

    var factory = this.container.lookupFactory('model:%@'.fmt(key));
    return factory;
  },

  cacheFor: function (key) {
    var context = this.get('context') || '_global_',
        cachePerContext = this.get('cachePerContext'),
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
});
