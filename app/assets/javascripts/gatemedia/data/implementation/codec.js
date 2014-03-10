
Data.Codec = Ember.Object.extend({
  decode: function (value/*, qualifier*/) {
    return value;
  },

  encode: function (value/*, qualifier*/) {
    return value;
  }
});


Data.codec = {
  string: Data.Codec.create({
    decode: function (value) {
      if (Ember.isNone(value)) {
        return value;
      }
      switch (Ember.typeOf(value)) {
      case 'string':
        return value;
      case 'object':
        return JSON.stringify(value);
      default:
        Ember.Logger.warn('string codec returning raw %@ value:'.fmt(Ember.typeOf(value)), value);
        return value;
      }
    },

    encode: function (value/*, qualifier*/) {
      if (!Ember.isNone(value)) {
        return '%@'.fmt(value);
      }
      return null;
    }
  }),

  number: Data.Codec.create({
    decode: function (value/*, qualifier*/) {
      if (Ember.typeOf(value) === 'number') {
        return value;
      }
      return Number(value);
    }
  }),

  boolean: Data.Codec.create({
    encode: function (value/*, qualifier*/) {
      return value ? true: false;
    }
  }),

  array: Data.Codec.create({
    decode: function (value, qualifier) {
      if (value) {
        return value.map(function (item) {
          return Data.codec[qualifier].decode(item);
        });
      }
      return null;
    },

    encode: function (value, qualifier) {
      if (value) {
        return value.map(function (item) {
          return Data.codec[qualifier].encode(item);
        });
      }
    }
  }),

  date: Data.Codec.create({
    decode: function (value/*, qualifier*/) {
      if (Ember.typeOf(value) === 'date') {
        return moment(value);
      }
      return moment(value, 'YYYY-MM-DD');
    },

    encode: function (value/*, qualifier*/) {
      if (value) {
        return value.format('YYYY-MM-DD');
      }
      return null;
    }
  }),

  time: Data.Codec.create({
    decode: function (value/*, qualifier*/) {
      return moment(value, 'HH:mm');
    },

    encode: function (value/*, qualifier*/) {
      if (value) {
        return value.format('HH:mm');
      }
      return null;
    }
  }),

  datetime: Data.Codec.create({
    decode: function (value/*, qualifier*/) {
      return moment(value, 'YYYY-MM-DDTHH:mm:ssZ');
    },

    encode: function (value/*, qualifier*/) {
      if (value) {
        return value.format('YYYY-MM-DDTHH:mm:ssZ');
      }
      return null;
    }
  }),

  json: Data.Codec.create({
    decode: function (value/*, qualifier*/) {
      return JSON.stringify(value);
    },

    encode: function (value/*, qualifier*/) {
      if (value === undefined) {
        return undefined;
      }
      return JSON.parse(value);
    }
  })
};
