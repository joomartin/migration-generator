let createTypeMapper = function (migrationLib = 'phinx') {
    let mapperClass = require(`./${migrationLib}`);
    return new mapperClass;
}

module.exports = createTypeMapper;