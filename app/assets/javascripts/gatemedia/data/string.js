
String.prototype.startsWith = function (prefix) {
    return this.substring(0, prefix.length) === prefix;
};

String.prototype.endsWith = function (suffix) {
    return this.substring(this.length - suffix.length) === suffix;
};


String.prototype.pluralize = function () {
    return this + 's';
};


String.prototype.singularize = function () {
    var match = this.match(/(.+)s$/);
    if (match) {
        return match[1];
    }
    return this;
};
