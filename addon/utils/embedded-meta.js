import Ember from 'ember';
// import codec from 'gatemedia-data/utils/codec';

export default function embeddedMeta(type, options) {
  options = options || {};

  var parts = type.split(':'),
      qualifier = parts[0],
      basicType = parts[1] || qualifier,
      isArray = false;

  switch (qualifier) {
  case 'array':
    isArray = true;
    break;
  }

  return {
    type: basicType,
    isAttribute: true,
    embedded: true,
    isArray: isArray,
    options: options,
    codec: {
      key: function (key) {
        return Ember.String.underscore(Ember.String.decamelize(key));
      },

      encode: function (instance, attribute) {
        if (isArray) {
          return Ember.A(instance.get(attribute).map(function (item) {
            return item.toJSON();
          }));
        }
        return instance.get(attribute).toJSON();
      }
    }
  };
}
