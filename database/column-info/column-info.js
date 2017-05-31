const _ = require('lodash');

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
    let parts = this.field['Type'].split('(');
    let options = {};
    
    if (length && !isNaN(length)) {
        options.length = parseInt(length);
    } else if (length) {
        options.length = length;
    }

    if (precision) {
        options.precision = parseInt(precision);
    }

    if (scale) {
        options.scale = parseInt(scale);
    }

    if (unsigned !== null) {
        options.unsigned = unsigned;
    }

    return options;
}

/**
 * @return Object
 */
ColumnInfo.prototype.getType = function () {
    let type = this.field['Type'];

    let parts = type.split('(');          
    let length = null;
    let scale = null;
    let precision = null;
    let unsigned = null;

    if (this.isTypeOf(type, 'decimal') || this.isTypeOf(type, 'int')) {
        unsigned = this.isUnsigned(type);
    }

    if (this.isTypeOf(type, 'decimal')) {
        precision = parseInt(parts[1].split(',')[0]);
        scale = parseInt(parts[1].split(',')[1]);
    } else if (parts[1]) { 
        length = parseInt(parts[1]);
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

    if (this.field['Null'] === 'NO') {
        options['null'] = false;
    }

    if (this.field['Default']) {
        options['default'] = this.field['Default'];
    }

    if (this.field['Extra'] === 'auto_increment') {
        options['auto_increment'] = true;
    }

    return (_.isEmpty(options)) ? null : this.mapOptions(options);
}

module.exports = ColumnInfo;