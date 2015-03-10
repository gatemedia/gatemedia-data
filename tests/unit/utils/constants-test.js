import { module, test } from 'qunit';
import Constants from 'gatemedia-data/utils/constants';

module('Constants');

test('values are correct', function (assert) {
  assert.equal(Constants.STRICT_OWNER, 'strict');
  assert.equal(Constants.LAX_OWNER, 'lax');
});
