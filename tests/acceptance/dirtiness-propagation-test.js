import Ember from 'ember';
import { module, test } from 'qunit';
import startApp from '../helpers/start-app';
import fakeAPI from 'gatemedia-data/utils/stubbing';

module('Dirtiness propagation', {

  beforeEach: function () {
    fakeAPI.reset({
      namespace: 'v2'
    });

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
  var done = assert.async();

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

  fakeAPI.stub().PUT('parents/42', {
    'parent': {
      'children': [{
        'id': 1,
        'name': 'Dick',
        'parent_id': 42
      }, {
        'id': 2,
        'name': 'Tac',
        'parent_id': 42
      }, {
        'id': 3,
        'name': 'Toe',
        'parent_id': 42
      }]
    }
  }, {
    'parent': {
      'id': 42
    }
  });
  parent.save().then(function () {
    assert.deepEqual(parent.get('children').getEach('meta.isDirty'), [
      false,
      false,
      false
    ], 'Children are clean after parent saving');
    assert.equal(parent.get('meta.isDirty'), false, 'Parent is clean after saving');


    parent.get('children').removeObject(parent.get('children.lastObject'));

    assert.deepEqual(parent.get('children').getEach('name'), [
      'Dick',
      'Tac'
    ], 'Children names are altered');
    assert.deepEqual(parent.get('children').getEach('meta.isDirty'), [
      false,
      false
    ], 'Remaining children are clean');
    assert.equal(parent.get('meta.isDirty'), true, 'Parent is dirty after child removing');


    fakeAPI.stub().PUT('parents/42', {
      'parent': {
        'children': [{
          'name': 'Dick'
        }, {
          'name': 'Tac'
        }]
      }
    }, {
      'parent': {
        'id': 42,
        'children': [{
          'id': 1,
          'name': 'Dick',
          'parent_id': 42
        }, {
          'id': 2,
          'name': 'Tac',
          'parent_id': 42
        }]
      }
    });
    parent.save().then(function () {
      assert.deepEqual(parent.get('children').getEach('name'), [
        'Dick',
        'Tac'
      ], 'Children names are altered');
      assert.deepEqual(parent.get('children').getEach('meta.isDirty'), [
        false,
        false
      ], 'Children are clean after parent saving');
      assert.equal(parent.get('meta.isDirty'), false, 'Parent is clean after saving');


      parent.get('children').pushObject(this.store.instanciate('child', {
        name: 'Jack'
      }));

      assert.deepEqual(parent.get('children').getEach('name'), [
        'Dick',
        'Tac',
        'Jack'
      ], 'Children names are correct');
      assert.deepEqual(parent.get('children').getEach('meta.isDirty'), [
        false,
        false,
        false
      ], 'Children are clean after child adding');
      assert.deepEqual(parent.get('children').getEach('meta.isNew'), [
        false,
        false,
        true
      ], 'Just added child is new');
      assert.equal(parent.get('meta.isDirty'), true, 'Parent is dirty after child adding');


      fakeAPI.stub().PUT('parents/42', {
        'parent': {
          'children': [{
            'id': 1,
            'name': 'Dick'
          }, {
            'id': 2,
            'name': 'Tac'
          }, {
            'id': null,
            'name': 'Jack'
          }]
        }
      }, {
        'parent': {
          'id': 42
        }
      });
      parent.save().then(function () {

        assert.equal(parent.get('meta.isDirty'), false, 'Parent is clean after saving');

        done();
      }.bind(this));
    }.bind(this));
  }.bind(this));
});
