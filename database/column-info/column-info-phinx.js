const ColumnInfo = require('./column-info');

function ColumnInfoPhinx() {
    ColumnInfo.call(this);
}

ColumnInfoPhinx.prototype = Object.create(ColumnInfo.prototype);

ColumnInfoPhinx.prototype.mapTypeOptions = function (typeOptions) {
    let original = Object.create(typeOptions);
    let mapped = Object.create(original);

    if (original.signed) {
        mapped.unsigned = !original.signed;
        delete mapped.signed;
    }

    return mapped;
}

ColumnInfoPhinx.prototype.mapOptions = function (options) {
    let original = Object.create(options);
    let mapped = Object.create(original);

    if (original.auto_increment) {
        mapped.identity = original.auto_increment;
        delete mapped.identity;
    }

    return mapped;
}