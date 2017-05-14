let createColumnInfo = function (type, field) {
    const columnInfoClass = require(`./${type}`);
    return new columnInfoClass(field);
}

module.exports = createColumnInfo;