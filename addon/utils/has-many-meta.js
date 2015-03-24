
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
        key = key.decamelize().underscore();
        if (options.inline) {
          return key.pluralize();
        }
        return '%@_ids'.fmt(key.singularize());
      },

      encode: function (instance, attribute) {
        var cache = instance.get('_relationsCache.%@'.fmt(attribute));

        if (options.inline) {
          cache = cache || instance.get('_data.' + this.key(attribute));
          return cache.map(function (item) {
            return item.toJSON([], true);
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
