import Ember from 'ember';

var VERSION = '2.5.5-beta2';
Ember.libraries.register('GM Data', VERSION);

export default {
  name: 'gatemedia-data-version',

  initialize: function () {
    return VERSION;
  }
};
