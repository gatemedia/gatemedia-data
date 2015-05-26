import resolver from './helpers/resolver';
import { setResolver } from 'ember-qunit';

setResolver(resolver);

if (typeof Function.prototype.bind !== 'function') {
  Function.prototype.bind = function (bind) {
    var self = this;
    return function () {
      var args = Array.prototype.slice.call(arguments);
      return self.apply(bind || null, args);
    };
  };
}
