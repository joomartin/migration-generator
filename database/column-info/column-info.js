const _ = require('lodash');

/**
 * @param field Array
 */
function ColumnInfo(field) {
    this.field = field;
}

ColumnInfo.prototype.getTypeOptions = function (type, precision, scale, length, signed) {
    let parts = this.field['Type'].split('(');
    let options = {};
    
    if (parts[0].trim() === 'longtext') {
        length = 'MysqlAdapter::TEXT_LONG';
    }

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

    options.signed = signed;

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
    let signed = !type.includes('UNSIGNED');

    if (type.includes('DECIMAL')) {
        precision = parseInt(parts[1].split(',')[0]);
        scale = parseInt(parts[1].split(',')[1]);
    }
    
    else if (parts[1]) { 
        length = parseInt(parts[1]);
    } 

    return {
        name: parts[0].trim(),
        options: this.getTypeOptions(this.field['Type'], precision, scale, length, signed)
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
        options['identity'] = true;
    }

    //if (this.field['Key'] === 'UNI') {
        //options['unique'] = true;
    //}

    return (_.isEmpty(options)) ? null : options;
}

/**
 * @return bool
 */
ColumnInfo.prototype.isPrimaryKey = function () {
    return this.field['Key'] === 'PRI';
}

module.exports = ColumnInfo;