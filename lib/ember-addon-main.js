'use strict';

var path = require('path');
var fs = require('fs');

function GatemediaData(project) {
  this.project = project;
  this.name = 'GatemediaData';
}

function unwatchedTree(dir) {
  return {
    read: function() { return dir; },
    cleanup: function() { }
  };
}

GatemediaData.prototype.treeFor = function treeFor (name) {
  var treePath = path.join('node_modules', 'gatemedia-data', name + '-addon');

  if (fs.existsSync(treePath)) {
    return unwatchedTree(treePath);
  }
};

GatemediaData.prototype.included = function included(app) {
  this.app = app;

  // this.app.import('lib/views/upload');
};

module.exports = GatemediaData;
