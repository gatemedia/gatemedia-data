import Ember from 'ember';
import tooling from '../tooling/silent-tooling';

export default Ember.Mixin.create({

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
      tooling.readDynamicAttribute(this, key, result);
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
