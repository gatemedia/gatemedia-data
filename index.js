/* jshint node: true */
'use strict';

module.exports = {
  name: 'gatemedia-data',

  included: function (app, parentAddon) {
    if (!app.import) {
      return;
    }
    this._super.included(app, parentAddon);

    app.import(app.bowerDirectory + '/ember-inflector/ember-inflector.js', {
      exports: {
        'ember-inflector': [
          'default',
          'pluralize',
          'singularize'
        ]
      }
    });
    app.import(app.bowerDirectory + '/momentjs/moment.js');
  }
};
