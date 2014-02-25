//= require_self
//= require ./implementation/string
//= require_tree ./implementation

Ember.$.support.cors = true;

/* global Data:true */
Data = Ember.Namespace.create({
  context: null,

  setContext: function (context) {
    this.set('context', context);
  },
  resetContext: function () {
    this.setContext(null);
  },

  ajax: function (settings) {
    return Ember.$.ajax(settings);
  }
});
