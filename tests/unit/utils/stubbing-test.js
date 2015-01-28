import fakeAPI from 'gatemedia-data/utils/stubbing';

module('fakeAPI');

test('it works', function() {
  fakeAPI.stub().GET('hop', {
    hop: 42
  });

  var got = false,
      processing = fakeAPI.processAjax({
    type: 'GET',
    url: 'http://gm.com/hop',
    success: function (result) {
      got = result;
    }
  });

  equal(processing.result.hop, 42);
  equal(got.hop, 42);
});
