const ColumnInfo = require('./column-info');

let createColumnInfo = function (field) {
    return new ColumnInfo(field);
}

module.exports = createColumnInfo;