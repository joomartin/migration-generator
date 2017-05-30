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

// const isDecimal = (type) => {
//     let parts = this.field['Type'].split('(');

//     return parts[1] && parts[1].includes(',');
// }

/**
 * @return Object
 */
ColumnInfo.prototype.getType = function () {
    let parts = this.field['Type'].split('(');          // ['DECIMAL ', '10, 2)']
    let length = null;
    let scale = 2;
    let precision = 10;
    let signed = !this.field['Type'].includes('UNSIGNED');

    if (this.field['Type'].includes('DECIMAL')) {
        precision = parseInt(parts[1].split(',')[0]);
        scale = parseInt(parts[1].split(',')[1]);
    } else if (parts[1] && parts[1].includes(' ')) {    // INT (10) UNSIGNED
        let optionsParts = parts[1].split(' ');
        signed = !(optionsParts[1] === 'unsigned' || optionsParts[1] === 'UNSIGNED');

        length = optionsParts[0].slice(0, optionsParts[0].length - 1);
    } else if (parts[1]) {   // INT (10)
        length = parts[1].slice(0, parts[1].length - 1);
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