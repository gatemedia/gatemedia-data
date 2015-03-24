/* jshint node: true */
'use strict';

module.exports = {
  name: 'gatemedia-data',

  included: function (app) {
    app.import('bower_components/ember-inflector/ember-inflector.js', {
      exports: {
        'ember-inflector': [
          'default',
          'pluralize',
          'singularize'
        ]
      }
    });
  }
};
