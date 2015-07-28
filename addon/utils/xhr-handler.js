import Ember from 'ember';

export default Ember.Object.extend({
  pending: true,
  cancelled: false,
  xhr: null,

  setXHR: function (xhr) {
    this.set('xhr', xhr);
  },

  cancel: function () {
    let xhr = this.get('xhr');
    if (xhr) {
      xhr.abort();
    }
    this.set('cancelled', true);
    this.complete();
  },

  complete: function () {
    this.set('pending', false);
  }
});
