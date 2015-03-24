import { module, test } from 'qunit';
import fakeAPI from 'gatemedia-data/utils/stubbing';

module('fakeAPI');

test('it works', function (assert) {
  fakeAPI.reset({
    namespace: 'v1'
  });
  fakeAPI.stub().GET('hop', {
    hop: 42
  });

  var got = false,
      processing = fakeAPI.processAjax({
    type: 'GET',
    url: 'http://gm.com/v1/hop',
    success: function (result) {
      got = result;
    }
  });

  assert.equal(processing.result.hop, 42);
  assert.equal(got.hop, 42);
});
