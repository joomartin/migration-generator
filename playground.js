const createTypeMapper = require('./database/type-mapper/factory');

let mapper = createTypeMapper('phinx');
console.log(mapper.map('varchar'));