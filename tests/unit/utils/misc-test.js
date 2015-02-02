import { belongsToKey } from 'gatemedia-data/utils/misc';

module('Misc helpers');

test('belongsToKey', function() {
  equal(belongsToKey('bam'), 'bam_id');
  equal(belongsToKey('bams'), 'bam_id');
  equal(belongsToKey('kaBoom'), 'ka_boom_id');
  equal(belongsToKey('kaBooms'), 'ka_boom_id');
});
