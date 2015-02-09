import Ember from 'ember';
import config from '../config/environment';

Ember.libraries.register('GM Data', config.APP.version);

export default {
  name: 'gatemedia-data-version',

  initialize: function () {}
};
