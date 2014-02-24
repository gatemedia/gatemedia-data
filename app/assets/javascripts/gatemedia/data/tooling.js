
Data.NoTooling = Ember.Object.create({

  readAttribute: Ember.K,
  readEmbedded: Ember.K,
  readBelongsTo: Ember.K,
  readHasMany: Ember.K
});


Data.LogTooling = Ember.Object.create({
  uses: [],
  log: true,

  readAttribute: function (instance, key, value) {
    this._logAttribute('attribute', instance, key, value);
  },

  readEmbedded: function (instance, key, value) {
    this._logAttribute('embedded', instance, key, value);
  },

  readBelongsTo: function (parent, instance, key, id, value) {
    this._logRelation('belongsTo', parent, instance, key, id, value);
  },

  readHasMany: function (parent, instance, key, ids, value) {
    this._logRelation('hasMany', parent, instance, key, ids, value);
  },

  _logAttribute: function (kind, instance, key, value) {
    var m = moment();
    this.get('uses').pushObject({
      'timestamp': m,
      'kind': kind,
      'instance': instance,
      'key': key,
      'value': value
    });
    if (this.get('log')) {
      Ember.Logger.debug('---', m.format('HH:mm:ss:sss'), kind,
        '%@[%@].%@'.fmt(instance.constructor.toString(), instance.get('_data.id'), key), value);
    }
  },
  _logRelation: function (kind, parent, instance, key, ids, value) {
    var m = moment();
    this.get('uses').pushObject({
      'timestamp': m,
      'kind': kind,
      'parent': parent,
      'instance': instance,
      'key': key,
      'ids': Ember.ensureArray(ids),
      'value': value
    });
    if (this.get('log')) {
      if (parent) {
        Ember.Logger.debug('=>>', m.format('HH:mm:ss:sss'), kind,
          instance.parent.toString(), '#%@'.fmt(parent.get('_data.id')),
          '%@[%@].%@'.fmt(instance.constructor.toString(), instance.get('_data.id'), key), '%@'.fmt(ids), value);
      } else {
        Ember.Logger.debug('==>', m.format('HH:mm:ss:sss'), kind,
          '%@[%@].%@'.fmt(instance.constructor.toString(), instance.get('_data.id'), key), '%@'.fmt(ids), value);
      }
    }
  },

  dump: function (level, from, to) {
    level = level || 0;

    var uses = this.get('uses');

    if (from) {
      uses = uses.filter(function (use) {
        return use.timestamp.isAfter(from);
      });
    }
    if (to) {
      uses = uses.filter(function (use) {
        return use.timestamp.isBefore(to);
      });
    }

    var previousUse,
        compactUses = [];

    function id (instance) {
      return '%@[%@]'.fmt(instance.constructor.toString(), instance.get('_data.id'));
    }

    uses.forEach(function (use) {
      var sameInstance,
          compactUse;

      if (!Ember.isNone(previousUse)) {
        sameInstance = id(use.instance) === id(previousUse.instance);
      }

      if (Ember.isNone(previousUse) || !sameInstance) {
        compactUse = {
          'instance': use.instance,
          'accesses': []
        };
        compactUses.pushObject(compactUse);
      } else {
        compactUse = compactUses.get('lastObject');
      }
      compactUse.accesses.pushObject({
        'timestamp': use.timestamp,
        'kind': use.kind,
        'parent': use.parent,
        'key': use.key,
        'ids': use.ids,
        'value': use.value
      });
      compactUse.string = '%@."%@"'.fmt(compactUse.instance.constructor, compactUse.accesses.map(function (access) {
        return access.key;
      }).sort().join(','));

      previousUse = use;
    });

    if (level > 0) {
      var veryCompactUses = [],
          previousCompactUse;

      compactUses.forEach(function (compactUse) {
        var veryCompactUse;

        if (Ember.isNone(previousCompactUse) || (compactUse.string !== previousCompactUse.string)) {
          veryCompactUse = {
            string: compactUse.string,
            count: 1
          };

          veryCompactUses.pushObject(veryCompactUse);
        } else {
          veryCompactUse = veryCompactUses.get('lastObject');
        }

        veryCompactUse.count += 1;

        previousCompactUse = compactUse;
      });
      compactUses = veryCompactUses;
    }

    if (level > 1) {
      compactUses = compactUses.getEach('string').uniq().map(function (string) {
        return {
          string: string,
          count: '*'
        };
      });
    }

    Ember.Logger.debug('---------------------------', from ? from.format('HH:mm:ss:sss') : '');
    compactUses.forEach(function (use) {
      if (use.count) {
        Ember.Logger.debug('%@ x %@'.fmt(use.string, use.count));
      } else {
        Ember.Logger.debug(id(use.instance));
        use.accesses.forEach(function (access) {
          Ember.Logger.debug('  .%@'.fmt(access.key, access.ids, access.value, access.kind));
        });
      }
    });
    Ember.Logger.debug('===========================', to ? to.format('HH:mm:ss:sss') : '');
  }
});


Data.tooling =  Data.NoTooling;
