import ModelArray from '../model-array';
import tooling from '../tooling/silent-tooling';
import getType from '../utils/get-type';

/**
  Declares a "to many" relation.
    - type: the "many" relation side's entity fully qualified class name
    - options: an optional object defining some extra relation behaviour settings (cf. below)

  Supported options:
    - nested: defaults to false. if true, this entity's parent will be the related entity
    - nestingParam: TODO
    - serialize: defaults to true, if false, this relation will not be seralized to API, and dirtyness will not be
      propagated to the parent
    - sideLoad: an extra side-loaded entities associated to this relation (exclusive with `sideLoads`)
    - sideLoads: a list of extra side-loaded entities associated to this relation
    - cascadeSaving: defaults to true. if true, the relation is also saved if needed when the holder is saved
    - inline: serialize as an array, inside holder.
 */
export default function (type, options) {
  options = options || {};
  options.cascadeSaving = !!options.cascadeSaving;

  var meta = {
    type: type,
    isRelation: true,
    options: options,
    codec: {
      key: function (key) {
        if (options.inline) {
          return key.decamelize();
        }
        return '%@_ids'.fmt(key.decamelize().singularize());
      },

      encode: function (instance, attribute) {
        var cache = instance.get('_relationsCache.%@'.fmt(attribute));

        if (options.inline) {
          cache = cache || instance.get('_data.' + this.key(attribute));
          return cache.map(function (item) {
            return item.toJSON();
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

  /* jshint maxcomplexity:11 */
  return Ember.computed(function(key/*, value, oldValue*/) {
    if (arguments.length > 1) {
      Ember.assert('SHOULD NOT DO THAT, BRO', false);
    } else {
      var meta = this.constructor.metaForProperty(key),
          type = getType(meta.type),
          ids = this.get('_data.' + meta.codec.key(key)),
          parent = meta.options.nested ? this : null,
          params,
          relationsCache = this.get('_relationsCache') || {},
          relation = relationsCache[key],
          content;

      tooling.readHasMany(parent, this, key, ids, relation);
      if (relation) {
        // Ember.Logger.debug('hasMany(%@.%@): use cache'.fmt(type, key));
        return relation;
      }

      if (this.get('meta.isNew')) {
        content = [];
        // Ember.Logger.debug('hasMany(%@.%@): empty set (new)'.fmt(type, key));
      } else {
        if (Ember.isEmpty(ids)) {
          content = [];
          // Ember.Logger.debug('hasMany(%@.%@): empty set'.fmt(type, key));
        } else {
          if (meta.options.nestingParam) {
            var parts = meta.options.nestingParam.split(':'),
              param = parts[1] || parts[0],
              valuePath = parts[1] ? parts[0] : 'id';

            params = {};
            params[param] = this.get(valuePath);
          }

          if (meta.options.inline) {
            content = type.loadMany(ids);
          } else {
            content = type.find(ids, parent, { sync: true, params: params });
            // Ember.Logger.debug('hasMany(%@.%@): retrieve %@'.fmt(type, key, ids));
          }
        }
      }

      relation = ModelArray.create({
        _type: meta.type,
        _owner: this,
        _field: key,
        _affectOwner: meta.options.serialize || false,
        content: content
      });
      content.forEach(function (record) {
        record.set('_container', relation);
      });
      relationsCache[key] = relation;
      return relation;
    }
  }).property('_data', '_relationsCache', '_cacheTimestamp').meta(meta);
}
