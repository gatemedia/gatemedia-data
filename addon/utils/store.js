import Ember from 'ember';
import repr from 'gatemedia-ext/utils/ember/repr';

export default Ember.Object.extend({
  container: null,

  instanciate: function (key, data, extraData) {
    var record = this.createRecord(key, data, extraData, false);
    record.set('meta.isNew', true);
    Ember.run.next(function () {
      record.dirty();
    });
    return record;
  },

  load: function (key, data, extraData) {
    var entityData, sideLoadData;

    if (Ember.isNone(data.id) && Ember.typeOf(data[key.underscore()]) === 'object') {
      entityData = data[key.underscore()];
      sideLoadData = data;
    } else {
      entityData = data;
      sideLoadData = null;
    }

    var load = this._load(key, entityData, extraData);
    Ember.Logger.debug('DATA - %@ [%@][%@] instance'.fmt(load.action, key, entityData.id));

    if (sideLoadData) {
      this.sideLoad(key, sideLoadData);
    } else {
      Ember.Logger.warn('DATA - Loaded [%@] entity from raw definition. No side load!'.fmt(key));
    }

    return load.record;
  },

  loadMany: function (key, data, extraData) { // jshint maxstatements:21
    data = data || [];

    var entitiesData, sideLoadData;

    if (Ember.typeOf(data) === 'array') {
      entitiesData = data;
      sideLoadData = null;
    } else {
      var k = key.underscore().pluralize();
      entitiesData = data[k];
      if (Ember.isNone(entitiesData)) {
        Ember.Logger.warn('Expected [%@] key but none found in %@'.fmt(k, repr(data)));
        entitiesData = [];
      }
      sideLoadData = data;
    }

    var loads = entitiesData.map(function (entityData) {
      return this._load(key, entityData, extraData);
    }, this);

    var loaded = loads.filterBy('action', 'Load'),
        updated = loads.filterBy('action', 'Update');
    if (loaded.length) {
      Ember.Logger.debug('DATA - Loaded %@ [%@] instances [%@]'.fmt(
        loaded.length, key.dasherize(), loaded.getEach('record.id').join(',')));
    }
    if (updated.length) {
      Ember.Logger.debug('DATA - Updated %@ [%@] instances [%@]'.fmt(
        updated.length, key.dasherize(), updated.getEach('record.id').join(',')));
    }

    if (sideLoadData) {
      this.sideLoad(key, sideLoadData);
    } else {
      Ember.Logger.warn('DATA - Loaded [%@] entities from raw definition. No side load!'.fmt(key.dasherize()));
    }

    return loads.getEach('record');
  },

  _load: function (key, entityData, extraData) {
    var useCache = extraData ? !extraData._embeddedContainer : true,
        cachedRecord = useCache ? this.cachedRecord(key, entityData.id) : null,
        record, action;

    if (cachedRecord) {
      cachedRecord._updateData(entityData);
      record = cachedRecord;
      action = 'Update';
    } else {
      record = this.createRecord(key, entityData, extraData);
      record.set('meta.isNew', false);
      action = 'Load';
    }
    record.resetCaches();

    return {
      record: record,
      action: action
    };
  },

  createRecord: function (key, data, extraData, useCache) {
    data = data || {};
    extraData = extraData || {};
    useCache = !Ember.isNone(useCache) ? useCache : !extraData._embeddedContainer;
    var model = this.modelFor(key),
        record = model.create({
      _data: data,
      _store: this,
      _createdAt: new Date(),
    });

    record.setProperties(extraData);
    if (useCache) {
      Ember.assert('Missing record id (%@)'.fmt(key), !Ember.isNone(data.id));

      var cache = this.cacheFor(key);
      cache[data.id] = record;
    }
    return record;
  },

  sideLoad: function (key, data, alreadyLoaded) {
    alreadyLoaded = alreadyLoaded || [];

    Ember.assert('You must call %@.sideLoad() with the initial key'.fmt(this.constructor), !Ember.isNone(alreadyLoaded));
    if (!Ember.isArray(alreadyLoaded)) {
      delete data[alreadyLoaded];
      alreadyLoaded = [alreadyLoaded];
    }

    var orderedRelations = [],
        types = {};

    orderedRelations.addRelation = function (key, type) {
      key = key.decamelize();
      if (!this.contains(key) && !alreadyLoaded.contains(key)) {
        types[key] = type;
        this.pushObject(key);
      }
    };

    function addAllRelations (keys) {
      keys.forEach(function (key) {
        var typeName = key.singularize().dasherize();
        orderedRelations.addRelation(key, typeName);
      });
    }

    this.modelFor(key).eachRelation(function (relationName, meta) {
      var sideLoads;
      if (meta.options.sideLoad) {
        sideLoads = [ meta.options.sideLoad ];
      } else if (meta.options.sideLoads) {
        sideLoads = meta.options.sideLoads;
      } else {
        sideLoads = [];
      }

      addAllRelations(meta.options.dependsOn || []);
      orderedRelations.addRelation(relationName, meta.type);
      addAllRelations(sideLoads);
    });

    orderedRelations.forEach(function (key) {
      var dataKey = key;
      if (!data.hasOwnProperty(dataKey)) {
        dataKey = types[key].underscore();
        if (!data.hasOwnProperty(dataKey)) {
          dataKey = key.pluralize();
          if (!data.hasOwnProperty(dataKey)) {
            dataKey = null;
          }
        }
      }
      if (dataKey) {
        if (Ember.typeOf(data[dataKey]) === 'array') {
          Ember.Logger.debug('DATA - Sideload %@ [%@] instances (`%@`)'.fmt(data[dataKey].length, types[key], dataKey));
          data[dataKey].forEach(function (entityData) {
            this._load(types[key], entityData);
          }, this);
        } else {
          Ember.Logger.debug('DATA - Sideload a single [%@] instance (`%@`)'.fmt(types[key], dataKey));
          this._load(types[key], data[dataKey]);
        }
        delete data[dataKey];
      }
    }, this);

    if (Ember.keys(data).length) {
      orderedRelations.forEach(function (relation) {
        var key = relation.singularize(),
            model = this.modelFor(key, true);
        if (model && Ember.keys(data).length) {
          this.sideLoad(key, data, alreadyLoaded.pushObjects(orderedRelations));
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
      var self = this; // for cli tests run compat... o_O)
      cached = ids.map(function (id) {
        return self.cachedRecord(key, id);
      }).compact();
      foundInCache = !Ember.isEmpty(ids) && (cached.length === ids.length);
    } else {
      cached = this.cachedRecord(key, id);
      foundInCache = !Ember.isNone(cached);
    }

    var async = !options.sync;

    if (async) {
      var target = this; // for cli tests run compat... o_O)
      return new Ember.RSVP.Promise(function (resolve, reject) {
        run.call(target, resolve, reject);
      });
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
          { key: key.underscore(), ids: ids, parent: parent },
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


  modelFor: function (key, permissive) {
    Ember.assert('Data store is missing its container', this.container);
    var factory = this.container.lookupFactory('model:%@'.fmt(key));
    if (!permissive) {
      Ember.assert('Unknown model "%@"'.fmt(key), factory);
    }
    return factory;
  },

  cacheFor: function (key) {
    key = key.dasherize();
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
