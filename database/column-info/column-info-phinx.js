const ColumnInfo = require('./column-info');

function ColumnInfoPhinx() {
    ColumnInfo.call(this);
}

ColumnInfoPhinx.prototype = Object.create(ColumnInfo.prototype);

ColumnInfoPhinx.mapTypeOptions = function (typeOptions) {
    let original = Object.create(typeOptions);
    let mapped = Object.create(original);

    if (original.signed) {
        mapped.unsigned = !original.signed;
        delete mapped.signed;
    }

    return mapped;
}