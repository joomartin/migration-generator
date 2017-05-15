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
    let decimals = null;
    let options = {};

    // DECIMAL (10,2)
    if (parts[1] && parts[1].includes(',')) {
        let lengthParts = parts[1].split(',');

        if (lengthParts[1] && lengthParts[1].includes(')')) {   // DECIMAL (10, 2) UNSIGNED
            length = lengthParts[0];
            let decimalParts = lengthParts[1].split(')');
            decimals = decimalParts[0];
            options.unsigned = (decimalParts.length > 1);
        } else {                                                // DECIMAL (10,2)
            length = lengthParts[0];
            decimals = lengthParts[1].slice(0, lengthParts[1].length - 1).trim();
        }

    } else if (parts[1] && parts[1].includes(' ')) {    // INT (10) UNSIGNED
        let optionsParts = parts[1].split(' ');
        options.unsigned = (optionsParts[1] === 'unsigned' || optionsParts[1] === 'UNSIGNED');

        length = optionsParts[0].slice(0, optionsParts[0].length - 1);
    } else if (parts[1]) {   // INT (10)
        length = parts[1].slice(0, parts[1].length - 1);
    }

    if (length) {
        options.length = parseInt(length);
    }

    if (decimals) {
        options.decimals = parseInt(decimals);
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
    let options = {};

    if (this.field['Null'] === 'NO') {
        options['null'] = false;
    }

    if (this.field['Default']) {
        options['default'] = this.field['Default'];
    }

    if (this.field['Key'] === 'UNI') {
        options['unique'] = true;
    }

    return (_.isEmpty(options)) ? null : options;
}

/**
 * @return bool
 */
ColumnInfo.prototype.isPrimaryKey = function () {
    return this.field['Key'] === 'PRI';
}

module.exports = ColumnInfo;