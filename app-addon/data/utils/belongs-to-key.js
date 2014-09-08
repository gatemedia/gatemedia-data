
export default function (relationName) {
  return relationName.decamelize().singularize() + '_id';
}
