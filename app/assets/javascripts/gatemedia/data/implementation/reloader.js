
Data.reloadingStrategies = Ember.Object.create({

  whileTrue: function (value) {
    return value === true;
  },

  never: function (/*value*/) {
    return false;
  }
});


Data.Reloader = Ember.Object.extend({
  record: null,
  triggers: null,

  init: function () {
    var record = this.get('record'),
      triggers = [];

    Ember.assert('Reloader should have a target record', record);

    record.constructor.eachAttribute(function (name, meta) {
      if (meta.options.reload) {
        triggers.addObject({
          attribute: name,
          strategy: meta.options.reload.strategy || 'never',
          timeout: meta.options.reload.timeout || 60000,
          reloadParent: meta.options.reload.reloadParent
        });
      }
    }, this);

    this.set('triggers', triggers);
  },

  checkTriggers: function () {
    var record = this.get('record'),
      target = record, log,
      id,
      createdAt = record.get('_createdAt'),
      needsReload = false,
      now = new Date(),
      delay = 5; //TODO make configurable

    function getParent (record, path) {
      var parent = record;

      for (var level = path.split('/').length; level > 0; level--) {
        parent = parent.get('_parent') || parent.get('_owner');
      }
      return parent;
    }

    this.get('triggers').forEach(function (trigger) {
      var value = record.get(trigger.attribute),
        check = Data.reloadingStrategies.getWithDefault(trigger.strategy, 'never');

      if (check.call(this, value) && (now - createdAt < trigger.timeout * 1000)) {
        needsReload = true;
        if (trigger.reloadParent) {
          target = getParent(record, trigger.reloadParent);
        }
      }
    }, this);

    if (needsReload) {
      id = target.get('id');
      if (target !== record) {
        log = '%@->%@'.fmt(record.constructor.toString(), target.constructor.toString());
      } else {
        log = target.constructor.toString();
      }
      Ember.Logger.debug('DATA - Will reload %@ (%@) in %@"'.fmt(log, id, delay));
      Ember.run.later(this, function () {
        record.constructor.find(id, target.get('_parent'), {
          noCache: true
        });
      }, delay * 1000);
    }
  }
});
