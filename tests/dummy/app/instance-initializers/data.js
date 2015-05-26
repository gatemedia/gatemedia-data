
export function initialize (instance) {
  var store = instance.container.lookup('store:main');

  store.set({
    container: instance.container
  });
}

export default {
  name: 'data',
  initialize: initialize
};
