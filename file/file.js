const _ = require('lodash');

let foo = (table, typeMapper, config) => {
    console.log(table);
    return false;
    const tableParts = table.table.split('_');
    const tablePartsUpper = tableParts
        .map(tp => tp.charAt(0).toUpperCase() + tp.slice(1));

    const variableName = _.camelCase(table.table);

    const migrationClass = `Create${tablePartsUpper.join('')}Table`;
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
        migrationClass, table,
        columns: fieldsData,
        variableName, primaryKey,
        dependencies: migrations[table].dependencies
    }, null, (err, html) => {
        if (err) throw err;

        migrations[table].html = html;
    });

    if (migrations[table].dependencies.length === 0) {
        migrations[table].allDependencyOrdered = true;
    }

    if (index === tables.length - 1) {
        //resolve(migrations);
    }
}

module.exports = {
    foo
}