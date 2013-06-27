//= require ./utils
//= require ./codec

Data.attr = function (type, options) {
    options = options || {};

    var meta = {
        type: type,
        isAttribute: true,
        options: options,
        codec: {
            key: function (key) {
                return key.decamelize();
            },

            decode: function (value) {
                var
                    parts = meta.type.split(':'),
                    type = parts[0],
                    qualifier = parts[1];

                return Data.codec[type].decode(value, qualifier);
            },

            encode: function (instance, attribute) {
                var
                    parts = meta.type.split(':'),
                    type = parts[0],
                    qualifier = parts[1],
                    value = attribute ? instance.get(attribute) : instance;

                return Data.codec[type].encode(value, qualifier);
            }
        }
    };

    return Ember.computed(function(key, value, oldValue) {
        if (arguments.length > 1) {
            var encodedValue = meta.codec.encode(value);
            this._changeAttribute(key, oldValue, encodedValue);
            this.set('_data.' + meta.codec.key(key), encodedValue);
        } else {
            value = this.get('_data.' + meta.codec.key(key));

            if (Ember.isNone(value)) {
                value = options.defaultValue;
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
        Ember.defineProperty(this, key, Ember.computed(function (key, newValue, oldValue) {
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
                default:
                    // nope
                }
            }
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


Data.belongsTo = function (type, options) {
    options = options || {};

    var meta = {
        type: type,
        isRelation: true,
        options: options,
        codec: {
            key: function (key) {
                return Data.belongsToKey(key);
            },

            encode: function (instance, attribute) {
                return instance.get('_data.' + this.key(attribute));
            }
        }
    };

    return Ember.computed(function(key, value, oldValue) {
        if (arguments.length > 1) {
            this.set('_data.' + meta.codec.key(key), value.get('id'));
            this.get('_relationsCache')[key] = value;
            Ember.run.next(this, function () {
                this._replaceRelation(key, oldValue, value);
                this.expireCaches();
            });
        } else {
            var
                type = Data.getType(meta.type),
                id = this.get('_data.' + meta.codec.key(key)),
                parent = meta.options.nested ? this : null,
                relationsCache = this.get('_relationsCache'),
                relation = relationsCache[key];

            if (relation) {
                return relation;
            }
            if (id) {
                relation = type.find(id, parent, { sync: true });
                relation.set('_owner', this);
                relationsCache[key] = relation;
            } else {
                relation = null;
            }
            return relation;
        }
    }).property('_data', '_relationsCache', '_cacheTimestamp').meta(meta);
};


Data.hasMany = function (type, options) {
    options = options || {};

    var meta = {
        type: type,
        isRelation: true,
        options: options,
        codec: {
            key: function (key) {
                return key.decamelize().singularize() + '_ids';
            },

            encode: function (instance, attribute) {
                return instance.get('_data.' + this.key(attribute));
            }
        }
    };

    return Ember.computed(function(key, value, oldValue) {
        if (arguments.length > 1) {
            Ember.assert('SHOULD NOT DO THAT, BRO', false);
        } else {
            var
                meta = this.constructor.metaForProperty(key),
                type = Data.getType(meta.type),
                ids = this.get('_data.' + meta.codec.key(key)),
                parent = meta.options.nested ? this : null,
                params,
                relationsCache = this.get('_relationsCache'),
                relation = relationsCache[key],
                content;

            if (relation) {
                // Ember.Logger.debug('hasMany(%@.%@): use cache'.fmt(type, key));
                return relation;
            }

            if (this.get('isNew')) {
                content = [];
                // Ember.Logger.debug('hasMany(%@.%@): empty set (new)'.fmt(type, key));
            } else {
                if (Ember.isEmpty(ids)) {
                    content = [];
                    // Ember.Logger.debug('hasMany(%@.%@): empty set'.fmt(type, key));
                } else {
                    if (meta.options.nestingParam) {
                        var
                            parts = meta.options.nestingParam.split(':'),
                            param = parts[1] || parts[0],
                            valuePath = parts[1] ? parts[0] : 'id';

                        params = {};
                        params[param] = this.get(valuePath);
                    }

                    content = type.find(ids, parent, { sync: true, params: params });
                    // Ember.Logger.debug('hasMany(%@.%@): retrieve %@'.fmt(type, key, ids));
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
            this.get('_relationsCache')[key] = relation;
            return relation;
        }
    }).property('_data', '_relationsCache', '_cacheTimestamp').meta(meta);
};
