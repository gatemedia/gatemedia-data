//= require ./utils
//= require ./codec
//= require ../tooling/attr

Data.attrMeta = function (type, options) {
  return {
    type: type,
    isAttribute: true,
    options: options || {},
    codec: {
      key: function (key) {
        return key.decamelize();
      },

      decode: function (value) {
        var
          parts = type.split(':'),
          basicType = parts[0],
          qualifier = parts[1];

        return Data.codec[basicType].decode(value, qualifier);
      },

      encode: function (instance, attribute) {
        var
          parts = type.split(':'),
          basicType = parts[0],
          qualifier = parts[1],
          value = attribute ? instance.get(attribute) : instance;

        return Data.codec[basicType].encode(value, qualifier);
      }
    }
  };
};

Data.attr = function (type, options) {
  options = options || {};
  var meta = Data.attrMeta(type, options);

  return Ember.computed(function(key, value, oldValue) {
    if (arguments.length > 1) {
      var encodedValue = meta.codec.encode(value);
      this._changeAttribute(key, oldValue, encodedValue);
      this.set('_data.' + meta.codec.key(key), encodedValue);
    } else {
      value = this.get('_data.' + meta.codec.key(key));

      Data.tooling.readAttribute(this, key, value);
      if (Ember.isNone(value)) {
        var data = this.get('_data');
        if ((data && data.hasOwnProperty(meta.codec.key(key))) || options.defaultUndefined) {
          value = options.defaultValue;
        } else {
          var id = this.get('_data.id');
          Ember.Logger.warn('Accessing undefined attribute %@[%@].%@ - Fetch full resource'.fmt(
            this.constructor, id, key));
          if (id) {
            this.reload({ /*useContext: false,*/ sync: true });
            value = this.get('_data.' + meta.codec.key(key));
          } else {
            Ember.Logger.info('New %@ instance, use default %@'.fmt(
              this.constructor, key));
            value = options.defaultValue;
          }
        }
      }
      value = meta.codec.decode(value);
    }
    return value;
  }).property('_data').meta(meta);
};


Data.embedded = function (type, options) {
  options = options || {};

  var meta = {
    type: type,
    isAttribute: true,
    options: options,
    codec: {
      key: function (key) {
        return key.decamelize();
      },

      encode: function (instance, attribute) {
        return instance.get(attribute).toJSON();
      }
    }
  };

  return Ember.computed(function(key, value, oldValue) {
    if (arguments.length > 1) {
      this._changeAttribute(key, oldValue, value);
      this.set('_data.' + meta.codec.key(key), value);
    } else {
      value = this.get('_data.' + meta.codec.key(key));

      Data.tooling.readEmbedded(this, key, value);
      if (value === undefined) {
        value = options.defaultValue;
      }
      value = Data.getType(type).load(value, {
        _embeddedContainer: this,
        _embeddedAttribute: key
      });
    }
    return value;
  }).property('_data').meta(meta);
};


Data.dynamicAttributable = Ember.Mixin.create({

  defineAttribute: function (key, definition) {
    Ember.defineProperty(this, key, Ember.computed(function (key, newValue/*, oldValue*/) {
      var result = newValue;
      if (arguments.length > 1) {
        Ember.set(this._data, key, result);
      } else {
        var decoder = definition.decoder || 'raw';
        result = Ember.get(this._data, key);
        switch (decoder) {
        case 'array':
          if (Ember.typeOf(result) === 'object') { // fix JQuery serialization or object arrays...
            var array = [];
            Ember.keys(result).forEach(function (index) {
              array[index] = result[index];
            });
            result = array;
          }
          break;
        default:
          // nope
        }
      }
      Data.tooling.readDynamicAttribute(this, key, result);
      return result;
    }).property('_data', '_data.%@'.fmt(key)).cacheable(false));

    if (Ember.isNone(Ember.get(this._data, key))) {
      Ember.set(this._data, key, definition.defaultValue);
    }
  },

  defineAttributes: function (object) {
    Ember.keys(object).forEach(function (key) {
      this.defineAttribute(key, object[key]);
    }, this);
  },

  resetAttributes: function (object) {
    this.set('_data', {});
    if (object) {
      this.defineAttributes(object);
    }
  },

  unknownProperty: function (propertyName) {
    if (this._data.hasOwnProperty(propertyName)) {
      return this._data[propertyName];
    }
  }
});

/**
  Declares a "to one" relation.
    - type: the "one" relation side's entity fully qualified class name
    - options: an optional object defining some extra relation behaviour settings (cf. below)

  Supported options:
    - nested: defaults to false. if true, this entity's parent will be the related entity
    - embedded: defaults to false. if true, the related entity's data is expected to be inlined inside holder's payload
    - sideLoad: an extra side-loaded entities associated to this relation (exclusive with `sideLoads`)
    - sideLoads: a list of extra side-loaded entities associated to this relation
    - cascadeSaving: defaults to true. if true, the relation is also saved if needed when the holder is saved
 */
Data.belongsTo = function (type, options) {
  options = options || {};
  options.cascadeSaving = !!options.cascadeSaving;

  var meta = {
    type: type,
    isRelation: true,
    options: options,
    codec: {
      key: function (key) {
        if (options.embedded) {
          return key;
        }
        return Data.belongsToKey(key);
      },

      encode: function (instance, attribute) {
        return instance.get('_data.' + this.key(attribute));
      }
    }
  };

  return Ember.computed(function(key, value, oldValue) {
    if (arguments.length > 1) {
      this.set('_data.' + meta.codec.key(key), value ? value.get('id') : value);
      this.get('_relationsCache')[key] = value;
      Ember.run.next(this, function () {
        this._replaceRelation(key, oldValue, value);
        this.expireCaches();
      });
    } else {
      var type = Data.getType(meta.type),
          id = this.get('_data.' + meta.codec.key(key)),
          parent = meta.options.nested ? this : null,
          relationsCache = this.get('_relationsCache') || {},
          relation = relationsCache[key];

      Data.tooling.readBelongsTo(parent, this, key, id, relation);
      if (relation) {
        return relation;
      }
      if (id) {
        if (options.embedded) {
          relation = type.load(id);
        } else {
          relation = type.find(id, parent, { sync: true });
        }
        if (relation) {
          relation.set('_owner', this);
          relationsCache[key] = relation;
        } else {
          Ember.Logger.warn('An error occured at relation fetching... %@[%@].%@[%@] is not populated'.fmt(
            this.constructor, this.get('id'), key, id
          ));
        }
      } else {
        relation = null;
      }
      return relation;
    }
  }).property('_data', '_relationsCache', '_cacheTimestamp').meta(meta);
};


/**
  Declares a "to many" relation.
    - type: the "many" relation side's entity fully qualified class name
    - options: an optional object defining some extra relation behaviour settings (cf. below)

  Supported options:
    - nested: defaults to false. if true, this entity's parent will be the related entity
    - nestingParam: TODO
    - serialize: defaults to true, if false, this relation will not be seralized to API, and dirtyness will not be
      propagated to the parent
    - sideLoad: an extra side-loaded entities associated to this relation (exclusive with `sideLoads`)
    - sideLoads: a list of extra side-loaded entities associated to this relation
    - cascadeSaving: defaults to true. if true, the relation is also saved if needed when the holder is saved
    - inline: serialize as an array, inside holder.
 */
Data.hasMany = function (type, options) {
  options = options || {};
  options.cascadeSaving = !!options.cascadeSaving;

  var meta = {
    type: type,
    isRelation: true,
    options: options,
    codec: {
      key: function (key) {
        if (options.inline) {
          return key.decamelize();
        }
        return '%@_ids'.fmt(key.decamelize().singularize());
      },

      encode: function (instance, attribute) {
        var cache = instance.get('_relationsCache.%@'.fmt(attribute));

        if (options.inline) {
          cache = cache || instance.get('_data.' + this.key(attribute));
          return cache.map(function (item) {
            return item.toJSON();
          });
        } else {
          if (cache) {
            return cache.getEach('id');
          }
          return instance.get('_data.' + this.key(attribute));
        }
      }
    }
  };

  /* jshint maxcomplexity:11 */
  return Ember.computed(function(key/*, value, oldValue*/) {
    if (arguments.length > 1) {
      Ember.assert('SHOULD NOT DO THAT, BRO', false);
    } else {
      var meta = this.constructor.metaForProperty(key),
          type = Data.getType(meta.type),
          ids = this.get('_data.' + meta.codec.key(key)),
          parent = meta.options.nested ? this : null,
          params,
          relationsCache = this.get('_relationsCache') || {},
          relation = relationsCache[key],
          content;

      Data.tooling.readHasMany(parent, this, key, ids, relation);
      if (relation) {
        // Ember.Logger.debug('hasMany(%@.%@): use cache'.fmt(type, key));
        return relation;
      }

      if (this.get('meta.isNew')) {
        content = [];
        // Ember.Logger.debug('hasMany(%@.%@): empty set (new)'.fmt(type, key));
      } else {
        if (Ember.isEmpty(ids)) {
          content = [];
          // Ember.Logger.debug('hasMany(%@.%@): empty set'.fmt(type, key));
        } else {
          if (meta.options.nestingParam) {
            var parts = meta.options.nestingParam.split(':'),
              param = parts[1] || parts[0],
              valuePath = parts[1] ? parts[0] : 'id';

            params = {};
            params[param] = this.get(valuePath);
          }

          if (meta.options.inline) {
            content = type.loadMany(ids);
          } else {
            content = type.find(ids, parent, { sync: true, params: params });
            // Ember.Logger.debug('hasMany(%@.%@): retrieve %@'.fmt(type, key, ids));
          }
        }
      }

      relation = Data.ModelArray.create({
        _type: meta.type,
        _owner: this,
        _field: key,
        _affectOwner: meta.options.serialize || false,
        content: content
      });
      content.forEach(function (record) {
        record.set('_container', relation);
      });
      relationsCache[key] = relation;
      return relation;
    }
  }).property('_data', '_relationsCache', '_cacheTimestamp').meta(meta);
};
