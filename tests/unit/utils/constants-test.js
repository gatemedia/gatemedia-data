import Constants from 'gatemedia-data/utils/constants';

module('constants');

test('values are correct', function() {
  equal(Constants.STRICT_OWNER, 'strict');
  equal(Constants.LAX_OWNER, 'lax');
});
