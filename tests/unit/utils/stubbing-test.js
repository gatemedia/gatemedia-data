import fakeAPI from 'gatemedia-data/utils/stubbing';

module('fakeAPI');

test('it works', function() {
  fakeAPI.stub().GET('hop', {
    hop: 42
  });

  var result = fakeAPI.processAjax({
    type: 'GET',
    url: 'hop'
  });

  equal(result.hop, 42);
});
