//= require ./utils
//= require ./codec
//= require ../tooling/attr


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
