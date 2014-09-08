
Ember.$.support.cors = true;

export default function (settings) {
  return Ember.$.ajax(settings);
}
