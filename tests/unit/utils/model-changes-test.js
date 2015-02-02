import ModelChanges from 'gatemedia-data/utils/model-changes';

module('ModelChanges');

test('Changes can be added incrementaly', function() {
  var changes = ModelChanges.create();

  deepEqual(changes.get('_changed'), [], 'No field changed');
  deepEqual(changes.get('_changes'), {}, 'No change stored');
  ok(!changes.get('hasChanges'), 'There are no changes flagged');

  changes.addChange('stuff', {
    value: 'paf'
  });

  deepEqual(changes.get('_changed'), ['stuff'], 'Field `stuff` changed');
  deepEqual(changes.get('_changes'), {
    stuff: [{
      value: 'paf'
    }]
  }, 'One change stored');
  ok(changes.get('hasChanges'), 'There are changes flagged');

  changes.addChange('stuff', {
    value: 'bam'
  });

  deepEqual(changes.get('_changed'), ['stuff'], 'Field `stuff` changed');
  deepEqual(changes.get('_changes'), {
    stuff: [{
      value: 'paf'
    }, {
      value: 'bam'
    }]
  }, 'Two changes stored');
  ok(changes.get('hasChanges'), 'There are changes flagged');


  changes.addChange('foo', {
    value: 'bar'
  });

  deepEqual(changes.get('_changed'), ['stuff', 'foo'], 'Fields `stuff` & `foo` changed');
  deepEqual(changes.get('_changes'), {
    stuff: [{
      value: 'paf'
    }, {
      value: 'bam'
    }],
    foo: [{
      value: 'bar'
    }]
  }, 'All changes stored');
  ok(changes.get('hasChanges'), 'There are changes flagged');


  changes.resetChanges('stuff');

  deepEqual(changes.get('_changed'), ['foo'], 'Field `foo` changed');
  deepEqual(changes.get('_changes'), {
    foo: [{
      value: 'bar'
    }]
  }, 'Remaining changes still stored');
  ok(changes.get('hasChanges'), 'There are changes flagged');

  changes.resetChanges('foo');

  deepEqual(changes.get('_changed'), [], 'No field changed');
  deepEqual(changes.get('_changes'), {}, 'No change stored');
  ok(!changes.get('hasChanges'), 'There are no more changes flagged');
});
