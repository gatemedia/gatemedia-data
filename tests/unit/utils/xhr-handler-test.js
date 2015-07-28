import Ember from 'ember';
import XHRHandler from 'gatemedia-data/utils/xhr-handler';
import { module } from 'qunit';
import test from 'ember-qunit-mock/lib/test';
import { setContext } from 'ember-test-helpers';

module('xhr-handler', {
  beforeEach: function () {
    Ember.run(function () {
      setContext({});
    });
  }
});


test('it works', function(assert) {
  let handler = XHRHandler.create();

  assert.ok(handler.get('pending'), 'XHR is pending by default');
  assert.equal(handler.get('cancelled'), false, 'XHR is not cancelled by default');
  assert.equal(handler.get('xhr'), null, 'XHR is not set by default');

  handler.complete();
  assert.equal(handler.get('cancelled'), false, 'XHR is not cancelled after completion');
  assert.equal(handler.get('pending'), false, 'XHR is no more pending after completion');
});


test('it can be cancelled', function(assert) {
  let handler = XHRHandler.create(),
      xhr = this.mock('xhr');

  assert.ok(handler.get('pending'), 'XHR is pending by default');
  assert.equal(handler.get('cancelled'), false, 'XHR is not cancelled by default');
  assert.equal(handler.get('xhr'), null, 'XHR is not set by default');

  handler.setXHR(xhr);
  assert.equal(handler.get('xhr'), xhr, 'XHR is set after setXHR');

  xhr.expect('abort');

  handler.cancel();
  assert.ok(handler.get('cancelled'), 'XHR is cancelled after cancel');
  assert.equal(handler.get('pending'), false, 'XHR is no more pending after cancel');
});
