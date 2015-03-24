import Model from 'gatemedia-data/utils/model';
import attribute from 'gatemedia-data/utils/attribute';
import belongsTo from 'gatemedia-data/utils/belongs-to';

export default Model.extend({
  name: attribute('string'),
  parent: belongsTo('parent', { owner: true })
});
