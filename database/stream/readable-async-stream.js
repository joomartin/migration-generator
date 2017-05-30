const { Readable } = require('stream');
const util = require('util');

function ReadableAsnyc(options = {}) {
    this.options = Object.create(options);
    this.options.objectMode = true;

    this._max = options.max || 10;
    this._index = 1;

    Readable.call(this, this.options);
}

util.inherits(ReadableAsnyc, Readable);

ReadableAsnyc.prototype._read = function () {
    if (this._index > this._max) {
        this._readEnd();
    } else {
        this._readBody();
        this._index++;
    }
}

ReadableAsnyc.prototype._readEnd = function () {
    this.push(null);
}

ReadableAsnyc.prototype._readBody = function () {
    throw Error('Not implemented');
}

module.exports = ReadableAsnyc;