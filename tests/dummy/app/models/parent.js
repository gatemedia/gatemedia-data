import Model from 'gatemedia-data/utils/model';
import attribute from 'gatemedia-data/utils/attribute';
import hasMany from 'gatemedia-data/utils/has-many';

export default Model.extend({
  name: attribute('string'),
  children: hasMany('child', { inline: true })
});
