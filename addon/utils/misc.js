import Ember from 'ember';

export function belongsToKey (relationName) {
  return relationName.decamelize().singularize() + '_id';
}

export function getType (type) {
  return Ember.get(type);
}

// export default
