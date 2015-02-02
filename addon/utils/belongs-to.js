import Ember from 'ember';
import belongsToMeta from 'gatemedia-data/utils/belongs-to-meta';
import tooling from 'gatemedia-data/utils/tooling';

/**
  Declares a "to one" relation.
    - type: the "one" relation side's entity fully qualified class name
    - options: an optional object defining some extra relation behaviour settings (cf. below)

  Supported options:
    - nested: defaults to false. if true, this entity's parent will be the related entity
    - embedded: defaults to false. if true, the related entity's data is expected to be inlined inside holder's payload
    - sideLoad: an extra side-loaded entities associated to this relation (exclusive with `sideLoads`)
    - sideLoads: a list of extra side-loaded entities associated to this relation
    - cascadeSaving: defaults to true. if true, the relation is also saved if needed when the holder is saved
 */
export default function (type, options) {
  options = options || {};
  options.cascadeSaving = !!options.cascadeSaving;

  var meta = belongsToMeta(type, options);

  return Ember.computed(function(key, value, oldValue) {
    if (arguments.length > 1) {
      this.set('_data.' + meta.codec.key(key), value ? value.get('id') : value);
      this.get('_relationsCache')[key] = value;
      Ember.run.next(this, function () {
        this._replaceRelation(key, oldValue, value);
      });
    } else {
      var id = this.get('_data.' + meta.codec.key(key)),
          parent = meta.options.nested ? this : null,
          relationsCache = this.get('_relationsCache') || {},
          relation = relationsCache[key];

      tooling.readBelongsTo(parent, this, key, id, relation);
      if (relation) {
        return relation;
      }
      if (id) {
        if (options.embedded) {
          relation = this._store.load(type, id);
        } else {
          relation = this._store.find(type, id, parent, { sync: true });
        }
        if (relation) {
          relation.set('_owner', this);
          relationsCache[key] = relation;
        } else {
          Ember.Logger.warn('An error occured at relation fetching... %@[%@].%@[%@] is not populated'.fmt(
            this.constructor, this.get('id'), key, id
          ));
        }
      } else {
        relation = null;
      }
      return relation;
    }
  }).property('_data', '_relationsCache', '_cacheTimestamp').meta(meta);
}
