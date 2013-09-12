//= require_self
//= require ./string
//= require_tree .
/* global Data:true */

Data = Ember.Namespace.create({

  ajax: function (settings) {
    return $.ajax(settings);
  }
});
