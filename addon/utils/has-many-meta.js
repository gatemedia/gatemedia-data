import Ember from 'ember';

export default function hasManyMeta(type, options) {
  options = options || {};
  return {
    type: type,
    isRelation: true,
    many: true,
    options: options,
    codec: {
      key: function (key) {
        if (options.key) {
          key = options.key;
        }
        key = Ember.String.underscore(Ember.String.decamelize(key));
        if (options.inline) {
          return Ember.String.pluralize(key);
        }
        return Ember.String.fmt('%@_ids', Ember.String.singularize(key));
      },

      encode: function (instance, attribute) {
        var cache = instance.get(Ember.String.fmt('_relationsCache.%@', attribute));

        if (options.inline) {
          cache = cache || instance.get('_data.' + this.key(attribute));
          return cache.map(function (item) {
            return item.toJSON(Ember.A(), true);
          });
        } else {
          if (cache) {
            return cache.getEach('id');
          }
          return instance.get('_data.' + this.key(attribute));
        }
      }
    }
  };
}
