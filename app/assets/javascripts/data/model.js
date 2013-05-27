//= require ./attributes
//= require ./model_changes
//= require ./adapter
//= require ./reloader

Data.Model = Ember.Object.extend({
    id: Data.attr('number', { serialize: false }),

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
        var
            parent = this.get('_parent'),
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
        var
            embeddedContainer = this.get('_embeddedContainer'),
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
        var
            parent = this.get('_parent'),
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
            container.get('_removed').pushObject(this);
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

    save: function () {
        var self = this;

        return new Ember.RSVP.Promise(function (resolve, reject) {

            function saveChildren (record, resolve, reject) {
                var
                    relationCaches = record.get('_relationsCache'),
                    savingTracker = Ember.Object.create({
                        relationsToSave: [],

                        save: function (relation) {
                            this.get('relationsToSave').pushObject(relation);
                        },
                        saved: function (relation) {
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
                                    savingTracker.saved(relationCache)
                                });
                            });
                        }
                    }
                });
                savingTracker.saved(); // in case of no relation to save...
            }

            // Ember.run(function () {
                if (self.get('isNew') || self.get('hasChanges') || self.get('isDeleted')) {
                    Data.adapter.save(self).then(function (record) {
                        Ember.run(function () {
                            saveChildren(record, resolve, reject);
                        });
                    });
                } else {
                    saveChildren(self, resolve, reject);
                }
            // });
        });
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
        var json = {};

        this.constructor.eachAttribute(function (attribute, meta) {
            if (meta.options.serialize !== false) {
                json[meta.codec.key(attribute)] = meta.codec.encode(this, attribute);
            }
        }, this);

        this.constructor.eachRelation(function (relation, meta) {
            if (meta.options.serialize !== false) {
                json[meta.codec.key(relation)] = meta.codec.encode(this, relation);
            }
        }, this);

        return json;
    }
});


Data.Model.reopenClass({

    instanciate: function (data, extraData) {
        extraData = extraData || {};
        extraData['isNew'] = true;

        var record = this.createRecord(data, extraData);
        Ember.run.next(record, function () {
            this._dirty();
        });
        return record;
    },

    load: function (data, extraData) {
        var
            useCache = extraData ? !extraData._embeddedContainer : true,
            cachedRecord = useCache ? this.cachedRecord(data.id) : null,
            record,
            reloader;

        if (cachedRecord) {
            cachedRecord._updateData(data);
            record = cachedRecord;
        } else {
            extraData = extraData || {};
            extraData['isNew'] = false;
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
        return data.map(function (itemData) {
            return this.load(itemData, extraData);
        }, this);
    },

    createRecord: function (data, extraData) {
        data = data || {};
        extraData = extraData || {};
        var
            useCache = !extraData._embeddedContainer,
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
        var
            orderedKeys = [],
            types = {};

        orderedKeys.addKey = function (key, type) {
            key = key.decamelize();
            if (!this.contains(key)) {
                types[key] = type;
                this.pushObject(key);
            }
        };

        this.eachRelation(function (relationName, meta) {
            var dependsOn = meta.options.dependsOn || [];

            dependsOn.forEach(function (key) {
                var
                    typeName = key.singularize().camelize().classify(),
                    namespace = this.toString().split('.')[0];

                orderedKeys.addKey(key, '%@.%@'.fmt(namespace, typeName));
            }, this);
            orderedKeys.addKey(relationName, meta.type);
        });

        orderedKeys.forEach(function (key) {
            var
                sideLoad = data[key],
                type;

            if (sideLoad) {
                type = types[key];
                Ember.Logger.debug('DATA - Sideload', sideLoad.length, type, "instances")
                sideLoad.forEach(function (sideItemData) {
                    Data.getType(type).load(sideItemData);
                });
            }
        });
    },

    find: function (id, parent, options) {
        switch (Ember.typeOf(id)) {
        case 'string':
        case 'number':
            return Data.adapter.findOne(this, id, parent, options);
        case 'array':
            return Data.adapter.findMany(this, id, parent, options);
        default:
            return Data.adapter.findMany(this, [], parent, options);
        }
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
        var typeName = this.toString().split('.')[1];

        return typeName.decamelize();
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
    }
});
