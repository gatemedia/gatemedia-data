import Ember from 'ember';
import ModelArray from 'gatemedia-data/utils/model-array';
import hasManyMeta from 'gatemedia-data/utils/has-many-meta';
import { belongsToKey } from 'gatemedia-data/utils/misc';
import tooling from 'gatemedia-data/utils/tooling';

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

  var meta = hasManyMeta(type, options);

  /* jshint maxcomplexity:14, maxstatements:29 */
  return Ember.computed(function(key/*, value, oldValue*/) {
    if (arguments.length > 1) {
      Ember.assert('SHOULD NOT DO THAT, BRO', false);
    } else {
      var meta = this.constructor.metaForProperty(key),
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
            var ownerRelation = this._store.modelFor(type).ownerRelation();
            if (ownerRelation) {
              var ownRelationKey = belongsToKey(ownerRelation.name),
                  ownerId = this.get('id');
              if (Ember.isNone(ids.get('firstObject.%@'.fmt(ownRelationKey)))) {
                Ember.Logger.info('Auto-assign %@ using %@'.fmt(type, ownRelationKey));
                ids.forEach(function (data) {
                  data[ownRelationKey] = ownerId;
                });
              }
              content = this._store.loadMany(type, ids);
            } else {
              Ember.Logger.error('%@ is missing owner relation for %@ inlining'.fmt(type, key));
              content = [];
            }
          } else {
            content = this._store.find(type, ids, parent, { sync: true, params: params });
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
