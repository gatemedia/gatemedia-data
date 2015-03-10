import { module, test } from 'qunit';
import ModelChanges from 'gatemedia-data/utils/model-changes';

module('ModelChanges');

test('Changes can be added incrementaly', function (assert) {
  var changes = ModelChanges.create();

  assert.deepEqual(changes.get('_changed'), [], 'No field changed');
  assert.deepEqual(changes.get('_changes'), {}, 'No change stored');
  assert.ok(!changes.get('hasChanges'), 'There are no changes flagged');

  changes.addChange('stuff', {
    value: 'paf'
  });

  assert.deepEqual(changes.get('_changed'), ['stuff'], 'Field `stuff` changed');
  assert.deepEqual(changes.get('_changes'), {
    stuff: [{
      value: 'paf'
    }]
  }, 'One change stored');
  assert.ok(changes.get('hasChanges'), 'There are changes flagged');

  changes.addChange('stuff', {
    value: 'bam'
  });

  assert.deepEqual(changes.get('_changed'), ['stuff'], 'Field `stuff` changed');
  assert.deepEqual(changes.get('_changes'), {
    stuff: [{
      value: 'paf'
    }, {
      value: 'bam'
    }]
  }, 'Two changes stored');
  assert.ok(changes.get('hasChanges'), 'There are changes flagged');


  changes.addChange('foo', {
    value: 'bar'
  });

  assert.deepEqual(changes.get('_changed'), ['stuff', 'foo'], 'Fields `stuff` & `foo` changed');
  assert.deepEqual(changes.get('_changes'), {
    stuff: [{
      value: 'paf'
    }, {
      value: 'bam'
    }],
    foo: [{
      value: 'bar'
    }]
  }, 'All changes stored');
  assert.ok(changes.get('hasChanges'), 'There are changes flagged');


  changes.resetChanges('stuff');

  assert.deepEqual(changes.get('_changed'), ['foo'], 'Field `foo` changed');
  assert.deepEqual(changes.get('_changes'), {
    foo: [{
      value: 'bar'
    }]
  }, 'Remaining changes still stored');
  assert.ok(changes.get('hasChanges'), 'There are changes flagged');

  changes.resetChanges('foo');

  assert.deepEqual(changes.get('_changed'), [], 'No field changed');
  assert.deepEqual(changes.get('_changes'), {}, 'No change stored');
  assert.ok(!changes.get('hasChanges'), 'There are no more changes flagged');
});
