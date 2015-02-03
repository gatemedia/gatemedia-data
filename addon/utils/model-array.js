import Ember from 'ember';
import Constants from 'gatemedia-data/utils/constants';

export default Ember.ArrayProxy.extend({
  _type: null,
  _owner: null,
  _field: null,
  _affectOwner: false,

  _removed: null,

  init: function () {
    this._super();

    this.set('_removed', []);
  },

  createRecord: function (data) {
    data = data || {};
    var key = this.get('_type'),
        ownerRelation = this._store.modelFor(key).ownerRelation(Constants.LAX_OWNER);

    Ember.assert("ModelArray of %@ does not have any relation to owner".fmt(key), ownerRelation);

    var dataOwnerKey = ownerRelation.meta.codec.key(ownerRelation.name),
        dataOwnerId = data[dataOwnerKey],
        owner = this.get('_owner'),
        ownerId = owner.get('id'),
        record;

    if (dataOwnerId) {
      Ember.assert("Trying to add a %@ which owner mismatches ModelArray holder".fmt(key), ownerId === dataOwnerId);
    } else {
      data[dataOwnerKey] = ownerId;
    }

    record = this._store.instanciate(key, data);
    record.get('_relationsCache')[ownerRelation.name] = owner;
    this.assignRecord(record);

    return record;
  },

  assignRecord: function (record) {
    var r = record;
    if (Ember.ObjectProxy.detectInstance(record)) {
      r = record.get('content');
    }
    r.set('_container', this);
    this.pushObject(r);
  },
  assignRecords: function (records) {
    records.forEach(function (record) {
      this.assignRecord(record);
    }, this);
  },

  cancelChanges: function () {
    var content = this.get('content');

    content.forEach(function (item) {
      item.cancelChanges();
    });
  },

  clear: function () {
    this._super();

    if (this.get('_affectOwner')) {
      var owner = this.get('_owner'),
          field = this.get('_field');

      owner.get(field).forEach(function (related) {
        owner._removeRelation(field, related);
      });
    }
  },
  pushObject: function (object) {
    this._super(object);

    if (this.get('_affectOwner')) {
      var owner = this.get('_owner'),
          field = this.get('_field');

      owner._addRelation(field, object);
    }
  },
  pushObjects: function (objects) {
    this._super(objects);

    if (this.get('_affectOwner')) {
      var owner = this.get('_owner'),
          field = this.get('_field');

      objects.forEach(function (object) {
        owner._addRelation(field, object);
      });
    }
  },
  removeObject: function (object) {
    this._super(object);

    if (this.get('_affectOwner')) {
      var owner = this.get('_owner'),
          field = this.get('_field');

      owner._removeRelation(field, object);
    }
  },
  //TODO wrap other MutableEnumerable methods...

  save: function () {
    var content = this.get('content'),
        removed = this.get('_removed');

    return Ember.RSVP.all(removed.map(function (removedItem) {
      return removedItem.save();
    })).then(function () {
      removed.clear();

      return Ember.RSVP.all(content.map(function (item) {
        return item.save();
      }));
    });
  }
});
