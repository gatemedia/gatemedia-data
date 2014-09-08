import codec from '../codec';
import tooling from '../tooling/silent-tooling';

function attrMeta (type, options) {
  return {
    type: type,
    isAttribute: true,
    options: options || {},
    codec: {
      key: function (key) {
        return key.decamelize();
      },

      decode: function (value) {
        var parts = type.split(':'),
            basicType = parts[0],
            qualifier = parts[1];

        return codec[basicType].decode(value, qualifier);
      },

      encode: function (instance, attribute) {
        var parts = type.split(':'),
            basicType = parts[0],
            qualifier = parts[1],
            value = attribute ? instance.get(attribute) : instance;

        return codec[basicType].encode(value, qualifier);
      }
    }
  };
}

export default function (type, options) {
  options = options || {};
  var meta = attrMeta(type, options);

  return Ember.computed(function(key, value, oldValue) {
    if (arguments.length > 1) {
      var encodedValue = meta.codec.encode(value);
      this._changeAttribute(key, oldValue, encodedValue);
      this.set('_data.' + meta.codec.key(key), encodedValue);
    } else {
      value = this.get('_data.' + meta.codec.key(key));

      tooling.readAttribute(this, key, value);
      if (Ember.isNone(value)) {
        var data = this.get('_data');
        if ((data && data.hasOwnProperty(meta.codec.key(key))) || options.defaultUndefined) {
          value = options.defaultValue;
        } else {
          var id = this.get('_data.id');
          if (id) {
            Ember.Logger.warn('Accessing undefined attribute %@[%@].%@ - Fetch full resource'.fmt(
              this.constructor, id, key));
            this.reload({ /*useContext: false,*/ sync: true });
            value = this.get('_data.' + meta.codec.key(key));
          } else {
            Ember.Logger.info('New %@ instance, use default %@'.fmt(
              this.constructor, key));
            value = options.defaultValue;
          }
        }
      }
      value = meta.codec.decode(value);
    }
    return value;
  }).property('_data', '_cacheTimestamp').meta(meta);
}
