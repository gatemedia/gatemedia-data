//= require_self
//= require ./implementation/string
//= require_tree ./implementation

Ember.$.support.cors = true;

/* global Data:true */
Data = Ember.Namespace.createWithMixins(
  Ember.Evented,
{

  ajax: function (settings) {
    return Ember.$.ajax(Ember.merge(settings, {
      xhrFields: {
        withCredentials: true
      }
    }));
  }
});

Data.on('xhr:error', function (xhr, status, error) {
  Ember.Logger.error('--- XHR Failed:', status, error);
});
