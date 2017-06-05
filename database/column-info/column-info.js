const _ = require('lodash');
const utils = require('../../utils/utils');

/**
 * @param field Array
 */
function ColumnInfo(field) {
    this.field = field;
}

ColumnInfo.prototype.mapType = function (nativeType) {
    return nativeType;
}

ColumnInfo.prototype.mapTypeOptions = function (typeOptions, type) {
    return typeOptions;
}

ColumnInfo.prototype.mapOptions = function (options) {
    return options;
}

ColumnInfo.prototype.isTypeOf = function (actual, expected) {
    return actual.includes(expected.toUpperCase()) || actual.includes(expected.toLowerCase());
}

ColumnInfo.prototype.isUnsigned = function (type) {
    return type.includes('unsigned') || type.includes('UNSIGNED');
}

/**
 * @return bool
 */
ColumnInfo.prototype.isPrimaryKey = function () {
    return this.field['Key'] === 'PRI';
}

ColumnInfo.prototype.getTypeOptions = function (type, precision, scale, length, unsigned) {
    const parts = this.field['Type'].split('(');
    let options = {};

    if (length && !isNaN(length)) {
        options.length = parseInt(length);
    } else if (length) {
        options.length = length;
    }

    utils.setKey(options, 'precision', precision, parseInt);
    utils.setKey(options, 'scale', scale, parseInt);
    utils.setKey(options, 'unsigned', unsigned, undefined, () => this.isTypeOf(type, 'decimal') || this.isTypeOf(type, 'int'));

    return options;
}

/**
 * @return Object
 */
ColumnInfo.prototype.getType = function () {
    const type = this.field['Type'];
    const parts = type.split('(');  

    let length = null;
    let scale = null;
    let precision = null;

    const unsigned = [type]
        .filter(t => this.isUnsigned(t))
        .length !== 0;

    if (this.isTypeOf(type, 'decimal')) {
        const splitted = parts[1].split(',');
        precision = [splitted[0]]
            .map(s => parseInt(s))
            .shift();

        scale = [splitted[1]]
            .map(s => parseInt(s))
            .shift();

    } else if (parts[1]) { 
        length = [parts[1]]
            .map(s => parseInt(s))
            .shift();
    } 

    return {
        name: parts[0].trim(),
        options: this.mapTypeOptions(
            this.getTypeOptions(this.field['Type'], precision, scale, length, unsigned), type)
    };
}

/**
 * @return null | Object
 */
ColumnInfo.prototype.getOptions = function () {
    let options = {
        'null': true,
    };

    utils.setKey(options, 'null', false, undefined, () => this.field['Null'] === 'NO');
    utils.setKey(options, 'default', this.field['Default']);
    utils.setKey(options, 'auto_increment', true, undefined, () => this.field['Extra'] === 'auto_increment');

    return (_.isEmpty(options)) 
        ? null : this.mapOptions(options);
}

module.exports = ColumnInfo;