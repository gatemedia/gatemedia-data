import Ember from 'ember';
import resolver from './helpers/resolver';
import {
  setResolver
} from 'ember-qunit';

setResolver(resolver);

document.write('<div id="ember-testing-container"><div id="ember-testing"></div></div>');

QUnit.config.urlConfig.push({ id: 'nocontainer', label: 'Hide container'});
var containerVisibility = QUnit.urlParams.nocontainer ? 'hidden' : 'visible';
document.getElementById('ember-testing-container').style.visibility = containerVisibility;


//TODO: remove when dependence working...

String.prototype.startsWith = function (prefix) {
  return this.substring(0, prefix.length) === prefix;
};

String.prototype.endsWith = function (suffix) {
  return this.substring(this.length - suffix.length) === suffix;
};

String.prototype.pluralize = function () {
  if (this.match(/s$/)) {
    return this;
  }
  if (this.match(/y$/)) {
    return this.slice(0, this.length - 1) + 'ies';
  }
  return this + 's';
};

String.prototype.singularize = function () {
  if (this.match(/ies$/)) {
    return this.slice(0, this.length - 3) + 'y';
  }
  if (this.match(/s$/)) {
    return this.slice(0, this.length - 1);
  }
  return this;
};


//TODO use gm-ext
Ember.repr = function (stuff) {
  switch (Ember.typeOf(stuff)) {
  case 'object':
    return '{%@}'.fmt(Ember.keys(stuff).map(function (key) {
      return "%@:%@".fmt(key, Ember.repr(stuff[key]));
    }).join(', '));
  case 'array':
    return '[%@]'.fmt(stuff.map(function (item) {
      return Ember.repr(item);
    }).join(', '));
  case 'string':
    return '"%@"'.fmt(stuff);
  default:
    return Ember.inspect(stuff);
  }
};
