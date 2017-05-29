const _ = require('lodash');

/**
 * @param field Array
 */
function ColumnInfo(field) {
    this.field = field;
}

/**
 * @return Object
 */
ColumnInfo.prototype.getType = function () {
    let parts = this.field['Type'].split('(');
    let length = null;
    let scale = null;
    let precision = null;
    let options = {};

    // DECIMAL (10,2)
    if (parts[1] && parts[1].includes(',')) {
        let lengthParts = parts[1].split(',');

        if (lengthParts[1] && lengthParts[1].includes(')')) {   // DECIMAL (10, 2) UNSIGNED
            precision = lengthParts[0];
            let decimalParts = lengthParts[1].split(')');
            scale = decimalParts[0];
            options.signed = !(decimalParts.length > 1);
        } else {                                                // DECIMAL (10,2)
            precision = lengthParts[0];
            scale = lengthParts[1].slice(0, lengthParts[1].length - 1).trim();
        }

    } else if (parts[1] && parts[1].includes(' ')) {    // INT (10) UNSIGNED
        let optionsParts = parts[1].split(' ');
        options.signed = !(optionsParts[1] === 'unsigned' || optionsParts[1] === 'UNSIGNED');

        length = optionsParts[0].slice(0, optionsParts[0].length - 1);
    } else if (parts[1]) {   // INT (10)
        length = parts[1].slice(0, parts[1].length - 1);
    }

    if (parts[0].trim() === 'longtext') {
        length = 'MysqlAdapter::TEXT_LONG';
    }

    if (length) {
        if (!isNaN(length)) {
            options.length = parseInt(length);
        } else {
            options.length = length;
        }
    }

    if (precision) {
        options.precision = parseInt(precision);
    }

    if (scale) {
        options.scale = parseInt(scale);
    }

    return {
        name: parts[0].trim(),
        options
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