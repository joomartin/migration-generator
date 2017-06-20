const ejs = require('ejs');
const { curry, compose, concat, join, map, split, __, inc } = require('ramda');

const { getSerial, getDate } = require('../utils/utils');
const { toUpperFirst, camelCase } = require('../utils/str');

const getFileNames = 
    map((table, index) => getFileName(table.table, compose(getSerial, inc)(index)));

const getFileName = (table, index) =>
    `${getDate()}${index}_create_${table}_table.php`;

const getTemplates = curry((ejs, config, columnInfoFactory, tables) =>
    Promise.all(map(getTemplate(ejs, config, columnInfoFactory))(tables)));

const generateFiles = curry((fs, file, config, fileNames, contents) =>
    Promise.all(contents.map((content, index) => {
        file.generateFile(fs, config, fileNames[index], content.html)
            .then(file => console.log(`${fileNames[index]} was generated successfully`))
    })));

/**
 * @param table Object
 * @param config Object
 * @param columnInfoFactory Function
 * @param ejs Object
 */
const getTemplate = curry((ejs, config, columnInfoFactory, table) => 
    new Promise((resolve, reject) => {
        const variableName = getVariableName(table.table);
        const migrationClass = getClassName(table.table);

        let primaryKey = [];

        const fieldsData = table.columns.map(f => {
            const columnInfo = columnInfoFactory(config, f);
            const options = columnInfo.getOptions();

            if (columnInfo.isPrimaryKey()) {
                primaryKey.push(f['Field']);
            }

            let typeObj = columnInfo.getType();
            typeObj.name = columnInfo.mapType(typeObj.name);

            return {
                name: f['Field'],
                type: typeObj,
                table, options, variableName,
            };
        });

        ejs.renderFile(`./templates/${config['migrationLib']}.ejs`, {
            migrationClass,
            table: table.table,
            columns: fieldsData,
            content: table.content,
            variableName, primaryKey,
            dependencies: table.dependencies,
            indexes: table.indexes
        }, null, (err, html) => {
            if (err) return reject(err);

            resolve({ table: table.table, html });
        });
    }));

const render = (ejs, fileName, data) =>
    new Promise((resolve, reject) =>
        ejs.renderFile(fileName, data, null, (err, html) =>
            err ? reject(err) : resolve(html)));

/**
 * @param {Array} tables 
 * @param {Object} config 
 * @param {Object} ejs 
 */
const getForeignKeyTemplate = (ejs, config, tables) => {
    let variableNames = {};
    tables.forEach(table => {
        variableNames[table.table] = camelCase(table.table);
    });

    return render(ejs, `./templates/${config['migrationLib']}-dependencies.ejs`, { tables, variableNames });
}

/**
 * @param {Object} ejs
 * @param {Object} config
 * @param {Array} viewTables
 */
const getViewTablesTemplate = curry(async (ejs, config, viewTables) =>
    render(ejs, `./templates/${config['migrationLib']}-view-tables.ejs`, { viewTables }));

/**
 * @param {Object} ejs
 * @param {Object} config
 * @param {Array} procedures
 */
const getProcedureTemplate = curry((ejs, config, procedures) =>
    render(ejs, `./templates/${config['migrationLib']}-procedures.ejs`, { procedures }));

/**
 * @param {Object} ejs
 * @param {Object} config
 * @param {Object} triggersByTables
 */
const getTriggersTemplate = curry((ejs, config, triggersByTables) =>
    render(ejs, `./templates/${config['migrationLib']}-triggers.ejs`, { triggersByTables }));

/**
 * @param content String
 * @param tableName String
 * @param config Object
 * @param fs Object
 * @param timestamp int
 * @return String
 */
const generateFile = curry((fs, config, fileName, content) =>
    new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(`${config.output}/${fileName}`, { highWaterMark: Math.pow(2, 16) });

        ws.write(content);
        ws.end();
        resolve(fileName);
    }));

const getClassName =
    compose(
        concat('Create'),
        compose(concat(__, 'Table'), join(''), map(toUpperFirst), split('_'))
    )

/**
 * @param tableName String
 * @return String
 */
const getVariableName = tableName => camelCase(tableName);


module.exports = {
    getTemplate,
    getTemplates,
    getForeignKeyTemplate,
    getViewTablesTemplate,
    getProcedureTemplate,
    getTriggersTemplate,
    getClassName,
    getVariableName,
    generateFile,
    generateFiles,
    getFileName,
    getFileNames
}