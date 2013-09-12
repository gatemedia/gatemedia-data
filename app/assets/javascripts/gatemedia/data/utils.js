
Data.STRICT_OWNER = 'strict';
Data.LAX_OWNER = 'lax';

Data.getType = function (type) {
  return Ember.get(type);
};


Data.belongsToKey = function (relationName) {
  return relationName.decamelize().singularize() + '_id';
};
