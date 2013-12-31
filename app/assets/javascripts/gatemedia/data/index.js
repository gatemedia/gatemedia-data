//= require_self
//= require ./string
//= require_tree .
/* global Data:true */

Ember.$.support.cors = true;

Data = Ember.Namespace.create({

  ajax: function (settings) {
    return Ember.$.ajax(settings);
  }
});
