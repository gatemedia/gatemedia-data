import Ember from 'ember';
import attributeMeta from 'gatemedia-data/utils/attribute-meta';
import tooling from 'gatemedia-data/utils/tooling';

export default function (type, options) {
  options = options || {};
  var meta = attributeMeta(type, options);

  return Ember.computed({
    get: function(key) {
      var value = this.get('_data.' + meta.codec.key(key));

      tooling.readAttribute(this, key, value);
      if (Ember.isNone(value)) {
        var data = this.get('_data');
        if ((data && data.hasOwnProperty(meta.codec.key(key))) || options.defaultUndefined) {
          value = options.defaultValue;
        } else {
          var id = this.get('_data.id');
          if (id) {
            Ember.Logger.warn(Ember.String.fmt('Accessing undefined attribute %@[%@].%@ - Fetch full resource',
              this.constructor, id, key));
            this.reload({ /*useContext: false,*/ sync: true });
            value = this.get('_data.' + meta.codec.key(key));
          } else {
            Ember.Logger.info(Ember.String.fmt('New %@ instance, use default %@',
              this.constructor, key));
            value = options.defaultValue;
          }
        }
      }
      value = meta.codec.decode(value);
      return value;
    },
    set: function(key, value, oldValue) {
      var encodedValue = meta.codec.encode(value);
      this._changeAttribute(key, oldValue, encodedValue);
      this.set('_data.' + meta.codec.key(key), encodedValue);
      return value;
    }
  }).property('_data', '_cacheTimestamp').meta(meta);
}
