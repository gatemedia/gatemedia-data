
String.prototype.startsWith = function (prefix) {
  return this.substring(0, prefix.length) === prefix;
};

String.prototype.endsWith = function (suffix) {
  return this.substring(this.length - suffix.length) === suffix;
};


var inflector = new Ember.Inflector();
inflector.plural(/$/, 's');
inflector.plural(/y$/, 'ies');

inflector.singular(/s$/,'');
inflector.singular(/ies$/,'y');

String.prototype.pluralize = function () {
  return inflector.pluralize(this);
};


String.prototype.singularize = function () {
  return inflector.singularize(this);
};
