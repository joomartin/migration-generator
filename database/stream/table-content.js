const util = require('util');

const ReadableAsnyc = require('./readable-async-stream');
const connection = require('../connection');

function TableContent(table, options) {
    this.table = table;
    ReadableAsnyc.call(this, options);
}

util.inherits(TableContent, ReadableAsnyc);

TableContent.prototype._readBody = function () {
    connection.query('SELECT * FROM `' + this.table + '`', (err, results) => {
        if (err) return this.emit('error', err);
        this.push(results);
    });
}

module.exports = TableContent