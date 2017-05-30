const util = require('util');

const ReadableAsnyc = require('./readable-async-stream');

function TableContent(connection, table, options) {
    this.table = table;
    this.connection = connection;

    ReadableAsnyc.call(this, options);
}

util.inherits(TableContent, ReadableAsnyc);

TableContent.prototype._readBody = function () {
    this.connection.query('SELECT * FROM `' + this.table + '`', (err, results) => {
        if (err) return this.emit('error', err);
        this.push(results);
    });
}

module.exports = TableContent