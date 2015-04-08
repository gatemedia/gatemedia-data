import Ember from 'ember';

export default Ember.Object.extend({
  _changed: null,
  _changes: null,

  init: function () {
    this._super();
    this.set('_changed', Ember.A());
    this.set('_changes', {});
  },

  addChange: function (attribute, change) {
    attribute = attribute.replace('.', '/');
    var key = '_changes.' + attribute,
      attributeChanges = this.get(key);

    if (!attributeChanges) {
      attributeChanges = Ember.A();
      this.set(key, attributeChanges);
      this.get('_changed').addObject(attribute);
    }
    attributeChanges.addObject(change);
  },

  resetChanges: function (attribute) {
    attribute = attribute.replace('.', '/');

    this.get('_changed').removeObject(attribute);
    delete this.get('_changes')[attribute];
  },

  hasChanges: Ember.computed('_changed.@each', function () {
    var changes = 0;

    this.get('_changed').forEach(function (key) {
      changes += this.get('_changes.' + key).length;
    }, this);
    return changes > 0;
  })
});
