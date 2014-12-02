import Ember from 'ember';

Ember.libraries.register('GM Data', '1.4.2');

export function belongsToKey (relationName) {
  return relationName.decamelize().singularize() + '_id';
}

export function getType (type) {
  return Ember.get(type);
}

// export default
