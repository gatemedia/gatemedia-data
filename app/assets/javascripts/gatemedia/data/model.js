//= require ./attributes
//= require ./model_changes
//= require ./adapter
//= require ./reloader

/**
  Events:
    - record:saved
 */
Data.Model = Ember.Object.extend(Ember.Evented, {

  id: Data.attr('number', { serialize: false }),
  createdAt: Data.attr('datetime', { serialize: false }),
  updatedAt: Data.attr('datetime', { serialize: false }),

  isNew: true,
  isDirty: false,
  isDeleted: false,

  _container: null,
  _attributeChanges: null,
  _relationChanges: null,
  /** Dereferenciated relations cache. Avoid processing time dereferencing (save, ...) */
  _relationsCache: null,

  init: function () {
    this._super();
    this._resetChanges();
    this.resetCaches();
  },

  _url: function () {
    var parent = this.get('_parent'),
      parts = [];

    if (parent) {
      parts.pushObject(parent.get('_url'));
    }
    parts.pushObject(this.constructor.resourceUrl());
    if (!this.get('isNew')) {
      parts.pushObject(this.get('id'));
    }
    return parts.join('/');
  }.property('id'),

  _parent: function () {
    var ownerRelation = this.constructor.ownerRelation(Data.STRICT_OWNER);

    if (ownerRelation) {
      return this.get('_relationsCache')[ownerRelation.name] || this.get(ownerRelation.name);
    }
    return null;
  }.property().cacheable(false),

  _updateData: function (data) {
    this.set('_data', data);
    this._resetChanges();
    this._resetDirtyness();
  },

  _resetDirtyness: function () {
    this.setProperties({
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
        if (cachedRelation && cachedRelation.get('isDirty')) {
          dirty = true;
        }
      }
    }, this);
    this.set('isDirty', dirty);

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

  _dirty: function () {
    var parent = this.get('_parent'),
      embeddedContainer = this.get('_embeddedContainer');

    this.set('isDirty', true);
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

    this.set('isDeleted', true);
    if (!this.get('isNew')) {
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

  save: function (extraParams) {
    var self = this,
      promise = new Ember.RSVP.Promise(function (resolve, reject) {

      function saveChildren (record, resolve/*, reject*/) {
        var relationCaches = record.get('_relationsCache'),
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
          if (!meta.options.owner) {
            var relationCache = relationCaches[relation];
            if (relationCache) {
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

      // Ember.run(function () {
      if (self.get('isNew') || self.get('hasChanges') || self.get('isDeleted')) {
        self.getAdapter().save(self, extraParams).then(function (record) {
          Ember.run(function () {
            saveChildren(record, resolve, reject);
          });
        });
      } else {
        saveChildren(self, resolve, reject);
      }
      // });
    });

    promise.on('promise:resolved', function(/*event*/) {
      self.trigger('record:saved', self);
    });
    promise.on('promise:failed', function(/*event*/) {
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

  toJSON: function () {
    var json = {},
      processedKeys = [];

    this.constructor.eachAttribute(function (attribute, meta) {
      if (meta.options.serialize !== false) {
        json[meta.codec.key(attribute)] = meta.codec.encode(this, attribute);
      }
      processedKeys.pushObject(meta.codec.key(attribute));
    }, this);

    this.constructor.eachRelation(function (relation, meta) {
      if (meta.options.serialize !== false) {
        json[meta.codec.key(relation)] = meta.codec.encode(this, relation);
      }
      processedKeys.pushObject(meta.codec.key(relation));
    }, this);

    Ember.keys(this._data).removeObjects(processedKeys).forEach(function (dynamicKey) {
      json[dynamicKey] = this._data[dynamicKey];
    }, this);

    return json;
  },

  getAdapter: function () {
    return this.constructor.getAdapter();
  }
});


Data.Model.reopenClass({

  instanciate: function (data, extraData) {
    extraData = extraData || {};
    extraData.isNew = true;

    var record = this.createRecord(data, extraData);
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
      extraData = extraData || {};
      extraData.isNew = false;
      record = this.createRecord(data, extraData);
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

    record.setProperties(extraData || {});
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
  find: function (id, parent, options) {
    var adapter = this.getAdapter();

    switch (Ember.typeOf(id)) {
    case 'string':
    case 'number':
      return adapter.findOne(this, id, parent, options);
    case 'array':
      return adapter.findMany(this, id, parent, options);
    case 'object':
      return adapter.findMany(this, [], parent, { params: id });
    default:
      return adapter.findMany(this, [], parent, options);
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
