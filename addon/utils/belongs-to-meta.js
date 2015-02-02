import { belongsToKey } from 'gatemedia-data/utils/misc';

export default function belongsToMeta(type, options) {
  options = options || {};
  return {
    type: type,
    isRelation: true,
    options: options,
    codec: {
      key: function (key) {
        if (options.alias) {
          key = options.alias;
        }
        if (options.embedded) {
          return key.decamelize().singularize();
        }
        return belongsToKey(key);
      },

      encode: function (instance, attribute) {
        return instance.get('_data.' + this.key(attribute));
      }
    }
  };
}
