import Ember from 'ember';
import embeddedMeta from 'gatemedia-data/utils/embedded-meta';
import tooling from 'gatemedia-data/utils/tooling';

export default function (type, options) {
  options = options || {};
  var meta = embeddedMeta(type, options);

  return Ember.computed(function(key, value, oldValue) {
    if (arguments.length > 1) {
      this._changeAttribute(key, oldValue, value);
      this.set('_data.' + meta.codec.key(key), value);
    } else {
      value = this.get('_data.' + meta.codec.key(key));

      tooling.readEmbedded(this, key, value);
      if (value === undefined) {
        value = options.defaultValue || {};
      }
      var load = (meta.isArray ? this._store.loadMany : this._store.load);
      value = Ember.run(this._store, load, meta.type, value, {
        _embeddedContainer: this,
        _embeddedAttribute: key
      });
    }
    return value;
  }).property('_data').meta(meta);
}
