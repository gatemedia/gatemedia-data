import Ember from 'ember';
import { module, test } from 'qunit';
import startApp from '../helpers/start-app';

module('Dirtiness propagation', {

  beforeEach: function () {
    this.app = startApp();
    // jshint camelcase:false
    this.container = this.app.__container__;
    // jshint camelcase:true
    this.store = this.container.lookup('store:main');
  },
  afterEach: function () {
    Ember.run(this.app, this.app.destroy);
  }
});

test('ModelArray - Inlined hasMany members propagate their dirtiness', function (assert) {
  var parent = this.store.load('parent', {
    'parent': {
      'id': 42,
      'name': 'John',
      'children': [{
        'id': 1,
        'name': 'Tic'
      }, {
        'id': 2,
        'name': 'Tac'
      }, {
        'id': 3,
        'name': 'Toe'
      }]
    }
  });

  assert.equal(parent.get('children.length'), 3, 'Children are loaded');
  assert.deepEqual(parent.get('children').getEach('name'), [
    'Tic',
    'Tac',
    'Toe'
  ], 'Children names are correct');
  assert.deepEqual(parent.get('children').getEach('meta.isDirty'), [
    false,
    false,
    false
  ], 'Children are clean');
  assert.equal(parent.get('meta.isDirty'), false, 'Parent is clean');

  parent.set('children.firstObject.name', 'Dick');
  assert.deepEqual(parent.get('children').getEach('name'), [
    'Dick',
    'Tac',
    'Toe'
  ], 'Children names are altered');
  assert.deepEqual(parent.get('children').getEach('meta.isDirty'), [
    true,
    false,
    false
  ], 'One child is dirty');

  assert.equal(parent.get('meta.isDirty'), true, 'Parent is dirty');
});
