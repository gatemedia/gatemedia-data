
export default function belongsToMeta(type, options) {
  options = options || {};
  return {
    type: type,
    isRelation: true,
    options: options,
    codec: {
      key: function (key) {
        if (options.key) {
          key = options.key;
        }
        key = key.decamelize().underscore().singularize();
        if (options.embedded) {
          return key;
        }
        return key + '_id';
      },

      encode: function (instance, attribute) {
        return instance.get('_data.' + this.key(attribute));
      }
    }
  };
}
