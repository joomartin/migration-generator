const _ = require('lodash');
const ejs = require('ejs');

/**
 * @param table Object
 * @param typeMapper Object
 * @param config Object
 * @param createColumnInfo Function
 */
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
            content: table.content,
            variableName, primaryKey,
            dependencies: table.dependencies
        }, null, (err, html) => {
            if (err) reject(err);

            resolve({ table: table.table, html });
        });
    });
}

/**
 * @param content String
 * @param tableName String
 * @param config Object
 * @param fs Object
 * @param timestamp int
 * @return String
 */
let generateFile = (content, tableName, config, fs, timestamp) => {
    let fileName = `${timestamp}_create_${tableName}_table.php`;
    let path = `${config.output}/${fileName}`;

    fs.writeFileSync(path, content);
    return fileName;
}

/**
 * @param tableName String
 * @return String
 */
let getClassName = (tableName) => {
    const tablePartsUpper = tableName.split('_')
        .map(tp => tp.charAt(0).toUpperCase() + tp.slice(1));

    return `Create${tablePartsUpper.join('')}Table`;
}

/**
 * @param tableName String
 * @return String
 */
let getVariableName = (tableName) => {
    return _.camelCase(tableName);
}

module.exports = {
    getTemplate,
    getClassName,
    getVariableName,
    generateFile
}