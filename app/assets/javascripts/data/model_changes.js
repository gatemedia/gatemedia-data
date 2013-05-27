
Data.ModelChanges = Ember.Object.extend({
    _changed: null,
    _changes: null,

    init: function () {
        this._super();
        this.set('_changed', []);
        this.set('_changes', {});
    },

    addChange: function (attribute, change) {
        var
            attribute = attribute.replace('.', '/'),
            key = '_changes.' + attribute,
            attributeChanges = this.get(key);

        if (!attributeChanges) {
            attributeChanges = [];
            this.set(key, attributeChanges);
            this.get('_changed').addObject(attribute);
        }
        attributeChanges.addObject(change);
    },

    resetChanges: function (attribute) {
        var attribute = attribute.replace('.', '/');

        this.get('_changed').removeObject(attribute);
        delete this.get('_changes')[attribute];
    },

    hasChanges: function () {
        var changes = 0;

        this.get('_changed').forEach(function (key) {
            changes += this.get('_changes.' + key).length;
        }, this);
        return changes > 0;
    }.property('_changed.@each')
});
