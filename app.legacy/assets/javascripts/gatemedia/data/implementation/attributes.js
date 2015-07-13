//= require ./utils
//= require ./codec
//= require ../tooling/attr

Data.dynamicAttributable = Ember.Mixin.create({

  defineAttribute: function (key, definition) {
    Ember.defineProperty(this, key, Ember.computed({
      get: function (key) {
        var decoder = definition.decoder || 'raw';
        var result = Ember.get(this._data, key);
        switch (decoder) {
        case 'array':
          if (Ember.typeOf(result) === 'object') { // fix JQuery serialization or object arrays...
            var array = Ember.A();
            Object.keys(result).forEach(function (index) {
              array[index] = result[index];
            });
            result = array;
          }
          break;
        default:
          // nope
        }
        Data.tooling.readDynamicAttribute(this, key, result);
        return result;
      },
      set: function (key, newValue/*, oldValue*/) {
        Ember.set(this._data, key, newValue);
        return newValue;
      },
    }).property('_data', '_data.%@'.fmt(key)).cacheable(false));

    if (Ember.isNone(Ember.get(this._data, key))) {
      Ember.set(this._data, key, definition.defaultValue);
    }
  },

  defineAttributes: function (object) {
    Object.keys(object).forEach(function (key) {
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
