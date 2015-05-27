import initializer from '../../../initializers/gatemedia-data-version';
import { module, test } from 'qunit';
import config from '../../../config/environment';

module('Version initializer');

test('version is sync', function(assert) {
  assert.equal(initializer.initialize(), config.APP.VERSION, 'version is sync between initializer & package');
});
