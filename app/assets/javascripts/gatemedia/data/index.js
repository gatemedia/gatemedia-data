//= require_self
//= require ./string
//= require_tree .

Data = Ember.Namespace.create({

    ajax: function (settings) {
        return $.ajax(settings);
    }
});
