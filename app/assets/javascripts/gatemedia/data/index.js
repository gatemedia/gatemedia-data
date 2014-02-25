//= require_self
//= require ./implementation/string
//= require_tree ./implementation

Ember.$.support.cors = true;

/* global Data:true */
Data = Ember.Namespace.create({

  ajax: function (settings) {
    return Ember.$.ajax(settings);
  }
});
