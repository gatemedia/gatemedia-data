
Data.ModelArray = Ember.ArrayProxy.extend({

    _type: null,
    _owner: null,
    _field: null,

    _removed: null,

    init: function () {
        this._super();

        this.set('_removed', []);
    },

    createRecord: function (data) {
        data = data || {};
        var
            type = Data.getType(this.get('_type')),
            ownerRelation = type.ownerRelation(Data.LAX_OWNER),
            dataOwnerKey = ownerRelation.meta.codec.key(ownerRelation.name),
            dataOwnerId = data[dataOwnerKey],
            owner = this.get('_owner'),
            ownerId = owner.get('id'),
            record;

        Ember.assert("ModelArray of %@ does not have any relation to owner".fmt(type), ownerRelation)
        if (dataOwnerId) {
            Ember.assert("Trying to add a %@ which owner mismatches ModelArray holder".fmt(type), ownerId === dataOwnerId)
        } else {
            data[dataOwnerKey] = ownerId;
        }

        record = type.instanciate(data);
        record.get('_relationsCache')[ownerRelation.name] = owner;
        this.assignRecord(record);

        return record;
    },

    assignRecord: function (record) {
        record.set('_container', this);
        this.pushObject(record);
    },

    cancelChanges: function () {
        var content = this.get('content');

        content.map(function (item) {
            item.cancelChanges();
        });
    },

    save: function () {
        var
            content = this.get('content'),
            removed = this.get('_removed'),
            promise = new Ember.RSVP.Promise(),
            saved = [];

        for (i = 0; i < removed.get('length'); ++i) {
            var removedItem = removed.popObject();
            removedItem.save();
        }
        content.map(function (item) {
            item.save().then(function (item) {
                saved.pushObject(item);
                if (saved.length === content.length) {
                    promise.resolve(saved);
                }
            });
        });

        return promise;
    }
});
