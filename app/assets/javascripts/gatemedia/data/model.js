//= require ./attributes
//= require ./model_changes
//= require ./adapter
//= require ./reloader

/**
  Events (intended for local model post-processing):
    - record:saved
    - record:failed
 */
Data.Model = Ember.Object.extend(Ember.Evented, {

  id: Data.attr('number', { serialize: false }),
  createdAt: Data.attr('datetime', { serialize: false }),
  updatedAt: Data.attr('datetime', { serialize: false }),

  _container: null,
  _attributeChanges: null,
  _relationChanges: null,
  /** Dereferenciated relations cache. Avoid processing time dereferencing (save, ...) */
  _relationsCache: null,

  /**
    Called before model saving.

    Intended for global model pre-processing.
   */
  willSave: Ember.K,
  /**
    Called after successful model saving.

    Intended for global model post-processing.
   */
  didSave: Ember.K,

  init: function () {
    this._super();
    this._resetChanges();
    this.resetCaches();
    this.set('meta', Ember.Object.create({
        isNew: true,
        isDirty: false,
        isDeleted: false
      })
    );
  },

  _url: function () {
    var parent = this.get('_parent'),
        parts = [];

    if (parent) {
      parts.pushObject(parent.get('_url'));
    }
    parts.pushObject(this.constructor.resourceUrl());
    if (!this.get('meta.isNew')) {
      parts.pushObject(this.get('id'));
    }
    return parts.join('/');
  }.property('meta.isNew', 'id'),

  _parent: function () {
    var ownerRelation = this.constructor.ownerRelation(Data.STRICT_OWNER);

    if (ownerRelation) {
      var relationsCache = this.get('_relationsCache') || {};
      return relationsCache[ownerRelation.name] || this.get(ownerRelation.name);
    }
    return null;
  }.property().cacheable(false),

  _updateData: function (data) {
    this.set('_data', data);
    this._resetChanges();
    this._resetDirtyness();
  },

  /**
    Reload this instance's properties from passed raw data.
   */
  reloadFrom: function (data) {
    var type = this.constructor;

    this._updateData(data[type.resourceKey()]);
    type.sideLoad(data);
    this.resetCaches();
  },

  /**
    Reload this instance from API.

    returns the promise of API call.
   */
  reload: function () {
    return this.constructor.find(this.get('id'), this.get('_parent'), {
      noCache: true
    });
  },

  _resetDirtyness: function () {
    this.get('meta').setProperties({
      isNew: false,
      isDirty: false
    });
    var parent = this.get('_parent');
    if (parent) {
      parent._computeDirtyness();
    }
  },

  _computeDirtyness: function () {
    var dirty = false;

    this.constructor.eachRelation(function (name, meta) {
      if (!meta.options.owner) {
        var cachedRelation = this.get('_relationsCache')[name];
        if (cachedRelation && cachedRelation.get('meta.isDirty')) {
          dirty = true;
        }
      }
    }, this);
    this.set('meta.isDirty', dirty);

    var parent = this.get('_parent');
    if (parent) {
      parent._computeDirtyness();
    }
  },

  _resetChanges: function () {
    this.set('_original', Ember.copy(this.get('_data'), true));
    this.set('_attributeChanges', Data.ModelChanges.create());
    this.set('_relationChanges', Data.ModelChanges.create());
  },

  resetCaches: function () {
    this.set('_relationsCache', {});
    this.expireCaches();
  },

  resetCache: function (relation) {
    this.set('_relationsCache.%@'.fmt(relation), null);
    this.expireCaches();
  },

  expireCaches: function () {
    this.set('_cacheTimestamp', new Date().getTime());
  },

  _changeAttribute: function (attribute, oldValue, newValue) {
    var embeddedContainer = this.get('_embeddedContainer'),
        path = (embeddedContainer ? this.get('_embeddedAttribute') + '.' : '') + attribute,
        changeHolder = embeddedContainer || this,
        attributeChanges = changeHolder.get('_attributeChanges');

    if (this.get('_original.' + path) === newValue) {
      attributeChanges.resetChanges(path);
      //TODO reset dirtyness
    } else {
      if (oldValue !== newValue) {
        attributeChanges.addChange(path, {
          attribute: path,
          oldValue: oldValue,
          newValue: newValue
        });
      }
      changeHolder._dirty();
    }
  },

  _addRelation: function (relation, addedMember) {
    this._changeRelation(relation, 'add', null, addedMember);
  },

  _removeRelation: function (relation, removedMember) {
    this._changeRelation(relation, 'remove', removedMember, null);
  },

  _replaceRelation: function (relation, oldRelated, newRelated) {
    this._changeRelation(relation, 'replace', oldRelated, newRelated);
  },

  _changeRelation: function (relation, action, oldMember, newMember) {
    this.get('_relationChanges').addChange(relation, {
      relation: relation,
      action: action,
      oldValue: oldMember,
      newValue: newMember
    });
    this._dirty();
  },

  _destroyRelation: function (relation, removedMember) {
    var data = this.get('_data'),
        attr = '%@_id'.fmt(relation.singularize());

    if (data.hasOwnProperty(attr)) {
      delete data[attr];
    } else {
      attr = attr.pluralize();
      data[attr].removeObject(removedMember.get('id'));
    }
    delete this.get('_relationsCache')[relation];
    this.expireCaches();
  },

  _dirty: function () {
    var parent = this.get('_parent'),
        embeddedContainer = this.get('_embeddedContainer');

    this.set('meta.isDirty', true);
    if (embeddedContainer) {
      embeddedContainer._dirty();
    }
    if (parent) {
      parent._dirty();
    }
  },

  hasChanges: function () {
    return this.get('_attributeChanges.hasChanges') || this.get('_relationChanges.hasChanges');
  }.property('_attributeChanges.hasChanges', '_relationChanges.hasChanges'),

  deleteRecord: function () {
    var container = this.get('_container');

    if (container) {
      var removed = container.get('_removed');
      if (removed) {
        removed.pushObject(this);
      }
      container.removeObject(this);
    }

    this.set('meta.isDeleted', true);
    if (!this.get('meta.isNew')) {
      this._dirty();
    } else {
      this._resetDirtyness();
    }
  },

  unload: function () {
    var container = this.get('_container');
    if (container) {
      container.removeObject(this);
    }
  },

  saveProperties: function () {
    return this.save(null, Array.prototype.slice.call(arguments, 0));
  },

  save: function (extraParams, includeProperties) {
    this.willSave();
    var self = this,
        promise = new Ember.RSVP.Promise(function (resolve, reject) {

      function saveChildren (record, resolve/*, reject*/) {
        var relationCaches = record.get('_relationsCache'),
            savingTracker;

        savingTracker = Ember.Object.create({
          relationsToSave: [],

          save: function (relation) {
            this.get('relationsToSave').pushObject(relation);
          },
          saved: function (/*relation*/) {
            var relationsToSave = this.get('relationsToSave');
            // relationsToSave.removeObject(relation);
            relationsToSave.popObject();
            if (Ember.isEmpty(relationsToSave)) {
              resolve(record);
            }
          }
        });

        record.constructor.eachRelation(function (relation, meta) {
          if ((Ember.isNone(includeProperties) || includeProperties.contains(relation)) &&
              !meta.options.owner &&
              meta.options.cascadeSaving) {
            var relationCache = relationCaches[relation];
            if (relationCache) {
              if (!relationCache.get('_affectOwner')) return;
              savingTracker.save(relationCache);
              relationCache.save().then(function () {
                Ember.run(function () {
                  savingTracker.saved(relationCache);
                });
              });
            }
          }
        });
        savingTracker.saved(); // in case of no relation to save...
      }

      if (self.get('meta.isNew') || self.get('hasChanges') || self.get('meta.isDeleted')) {
        self.getAdapter().save(self, extraParams, includeProperties).then(function (record) {
          Ember.run(record, function () {
            saveChildren(this, resolve, reject);
          });
        }, function (error) {
          reject(error);
        });
      } else {
        saveChildren(self, resolve, reject);
      }
    });

    promise.then(function() {
      self.didSave();
      self.trigger('record:saved', self);
    }, function() {
      self.trigger('record:failed', self);
    });
    return promise;
  },

  cancelChanges: function () {
    var relationCaches = this.get('_relationsCache');

    this.constructor.eachRelation(function (relation, meta) {
      if (meta.options.nested) {
        var relationCache = relationCaches[relation];
        if (relationCache) {
          relationCache.cancelChanges();
        }
      }
    });

    this._updateData(Ember.copy(this.get('_original'), true));
  },

  toJSON: function (includeProperties) {
    var json = {},
        processedKeys = [];

    this.constructor.eachAttribute(function (attribute, meta) {
      if ((meta.options.serialize !== false) && (Ember.isNone(includeProperties) || includeProperties.contains(attribute))) {
        json[meta.codec.key(attribute)] = meta.codec.encode(this, attribute);
      }
      processedKeys.pushObject(meta.codec.key(attribute));
    }, this);

    this.constructor.eachRelation(function (relation, meta) {
      if ((meta.options.serialize !== false) && (Ember.isNone(includeProperties) || includeProperties.contains(relation))) {
        json[meta.codec.key(relation)] = meta.codec.encode(this, relation);
      }
      processedKeys.pushObject(meta.codec.key(relation));
    }, this);

    Ember.assert("Model internal state not initialized. Maybe you used .create() instead of .instanciate() for %@...".fmt(this),
      !Ember.isNone(this._data));
    Ember.keys(this._data).removeObjects(processedKeys).forEach(function (dynamicKey) {
      if (Ember.isNone(includeProperties) || includeProperties.contains(dynamicKey)) {
        json[dynamicKey] = this._data[dynamicKey];
      }
    }, this);

    return json;
  },

  getAdapter: function () {
    return this.constructor.getAdapter();
  }
});


Data.Model.reopenClass({

  instanciate: function (data, extraData) {
    var record = this.createRecord(data, extraData);
    record.set('meta.isNew', true);
    Ember.run.next(record, function () {
      this._dirty();
    });
    return record;
  },

  load: function (data, extraData) {
    var useCache = extraData ? !extraData._embeddedContainer : true,
        cachedRecord = useCache ? this.cachedRecord(data.id) : null,
        record,
        reloader;

    if (cachedRecord) {
      cachedRecord._updateData(data);
      record = cachedRecord;
    } else {
      record = this.createRecord(data, extraData);
      record.set('meta.isNew', false);
    }
    record.resetCaches();

    reloader = record.get('_reloader');
    if (reloader) {
      reloader.checkTriggers();
    }

    return record;
  },

  loadMany: function (data, extraData) {
    data = data || [];
    return data.map(function (itemData) {
      return this.load(itemData, extraData);
    }, this);
  },

  createRecord: function (data, extraData) {
    data = data || {};
    extraData = extraData || {};
    var useCache = !extraData._embeddedContainer,
        record = this.create({
      _data: data,
      _createdAt: new Date(),
    });

    record.setProperties(extraData);
    if (this.hasReloading()) {
      record.set('_reloader', Data.Reloader.create({
        record: record
      }));
    }
    if (useCache) {
      this.cacheRecord(data.id, record);
    }
    return record;
  },

  hasReloading: function () {
    var hasReload = false;

    this.eachAttribute(function (name, meta) {
      if (meta.options.reload) {
        hasReload = true;
      }
    });
    return hasReload;
  },

  /**
   * Iterate through model relations, invoking callback with relation's name & meta.
   */
  eachAttribute: function (callback, binding) {
    this.eachComputedProperty(function (name, meta) {
      if (meta.isAttribute) {
        callback.call(binding || this, name, meta);
      }
    }, this);
  },

  /**
   * Iterate through model relations, invoking callback with relation's name & meta.
   */
  eachRelation: function (callback, binding) {
    this.eachComputedProperty(function (name, meta) {
      if (meta.isRelation) {
        callback.call(binding || this, name, meta);
      }
    }, this);
  },

  sideLoad: function (data) {
    var orderedKeys = [],
        types = {},
        namespace = this._classInfo().namespace;

    orderedKeys.addKey = function (key, type) {
      key = key.decamelize();
      if (!this.contains(key)) {
        types[key] = type;
        this.pushObject(key);
      }
    };

    function addAllKeys (keys) {
      keys.forEach(function (key) {
        var typeName = key.singularize().camelize().classify();
        orderedKeys.addKey(key, '%@.%@'.fmt(namespace, typeName));
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
            type = Data.getType(types[key]);
        Ember.Logger.debug('DATA - Sideload', sideLoad.length, type, "instances", sideLoad);
        sideLoad.forEach(function (sideItemData) {
          type.load(sideItemData);
        });
        delete data[dataKey];
      }
    }, this);
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
  find: function (id, parent, options, hooks) {
    var adapter = this.getAdapter();

    switch (Ember.typeOf(id)) {
    case 'string':
    case 'number':
      return adapter.findOne(this, id, parent, options, hooks);
    case 'array':
      return adapter.findMany(this, id, parent, options, hooks);
    case 'object':
      return adapter.findMany(this, [], parent, { params: id }, hooks);
    default:
      return adapter.findMany(this, [], parent, options, hooks);
    }
  },

  /**
    Return all loaded records (in cache), without issuing any request to the API.

    Beware, the result is not bound to the cache so it will reflect the cache state at call time.
   */
  all: function () {
    var cache = this._cache || {};
    return Ember.keys(cache).map(function (id) { return cache[id]; });
  },

  cacheRecord: function (id, value) {
    this._cache = this._cache || {};
    this._cache[id] = value;
  },
  cachedRecord: function (id) {
    if (this._cache) {
      return this._cache[id];
    }
  },

  resourceKey: function () {
    return this._classInfo().className.decamelize();
  },

  resourceUrl: function () {
    return this.resourceKey().pluralize();
  },

  ownerRelation: function (checking) {
    var ownerRelation;

    this.eachRelation(function (relation, meta) {
      if (meta.options.owner && !((checking === Data.STRICT_OWNER) && (meta.options.follow === false))) {
        ownerRelation = {
          name: relation,
          meta: meta
        };
      }
    }, this);
    return ownerRelation;
  },

  getAdapter: function () {
    var namespace = Ember.get(this._classInfo().namespace);
    return namespace.adapter ||
         namespace.__container__.lookup('adapter:default'); //TODO improve injection management...
  },

  _classInfo: function () {
    var info = /(.+)\.(\w+)/.exec(this.toString());
    return {
      namespace: info[1],
      className: info[2]
    };
  }
});
