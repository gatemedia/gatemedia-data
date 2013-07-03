
Data.Codec = Ember.Object.extend({
    decode: function (value, qualifier) {
        return value;
    },

    encode: function (value, qualifier) {
        return value;
    }
});


Data.codec = {
    string: Data.Codec.create({
        encode: function (value, qualifier) {
            return '%@'.fmt(value);
        }
    }),

    number: Data.Codec.create({
        decode: function (value, qualifier) {
            if (Ember.typeOf(value) === 'number') {
                return value;
            }
            return Number(value);
        }
    }),

    boolean: Data.Codec.create({
        encode: function (value, qualifier) {
            return value ? 't': 'f';
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
        decode: function (value, qualifier) {
            if (Ember.typeOf(value) === 'date') {
                return moment(value);
            }
            return moment(value, 'YYYY-MM-DD');
        },

        encode: function (value, qualifier) {
            if (value) {
                return value.format('YYYY-MM-DD');
            }
            return null;
        }
    }),

    time: Data.Codec.create({
        decode: function (value, qualifier) {
            return moment(value, 'HH:mm');
        },

        encode: function (value, qualifier) {
            if (value) {
                return value.format('HH:mm');
            }
            return null;
        }
    }),

    datetime: Data.Codec.create({
        decode: function (value, qualifier) {
            return moment(value, 'YYYY-MM-DD HH:mm');
        },

        encode: function (value, qualifier) {
            if (value) {
                return value.format('YYYY-MM-DD HH:mm');
            }
            return null;
        }
    })
};
