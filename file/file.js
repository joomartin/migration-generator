const _ = require('lodash');
const ejs = require('ejs');

let getTemplate = (table, typeMapper, config, createColumnInfo) => {
    return new Promise((resolve, reject) => {
        const variableName = getVariableName(table.table);
        const migrationClass = getClassName(table.table);

        let primaryKey = null;

        const fieldsData = table.columns.map(f => {
            const columnInfo = createColumnInfo(f);
            const options = columnInfo.getOptions();

            if (columnInfo.isPrimaryKey()) {
                primaryKey = f['Field'];
            }

            let typeObj = columnInfo.getType();
            typeObj.name = typeMapper.map(typeObj.name);

            return {
                name: f['Field'],
                type: typeObj,
                table, options, variableName
            };
        });

        ejs.renderFile(`./templates/${config['migrationLib']}.ejs`, {
            migrationClass,
            table: table.table,
            columns: fieldsData,
            variableName, primaryKey,
            dependencies: table.dependencies
        }, null, (err, html) => {
            if (err) reject(err);

            resolve({table: table.table, html});
        });

        if (table.dependencies.length === 0) {
            table.allDependencyOrdered = true;
        }
    });
}

let getClassName = (tableName) => {
    const tablePartsUpper = tableName.split('_')
        .map(tp => tp.charAt(0).toUpperCase() + tp.slice(1));

    return `Create${tablePartsUpper.join('')}Table`;
}

let getVariableName = (tableName) => {
    return _.camelCase(tableName);
}

module.exports = {
    getTemplate,
    getClassName,
    getVariableName
}