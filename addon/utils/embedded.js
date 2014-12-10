import Ember from 'ember';
import tooling from 'gatemedia-data/utils/tooling';

export default function (type, options) {
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

      tooling.readEmbedded(this, key, value);
      if (value === undefined) {
        value = options.defaultValue;
      }
      value = this._store.load(type, value, {
        _embeddedContainer: this,
        _embeddedAttribute: key
      });
    }
    return value;
  }).property('_data').meta(meta);
}
