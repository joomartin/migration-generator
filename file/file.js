const _ = require('lodash');
const ejs = require('ejs');
const R = require('ramda');

const utils = require('../utils/utils');
const strUtils = require('../utils/str');

const getFileNames = (date, tables, file, padIndex) =>
    tables.map((table, index) => file.getFileName(date, table.table, padIndex(index + 1)))

const getFileName = (date, table, index) =>
    `${utils.getDate()}${index}_create_${table}_table.php`;

const getTemplates = R.curry((ejs, file, config, columnInfoFactory, tables) =>
    Promise.all(R.map(file.getTemplate(ejs, config, columnInfoFactory))(tables)));

const generateFiles = (contents, fileNames, config, fs, file) =>
    Promise.all(contents.map((content, index) =>
        file.generateFile(content.html, fileNames[index], config, fs)
            .then(file =>  console.log(`${fileNames[index]} was generated successfully`))
    ));

/**
 * @param table Object
 * @param config Object
 * @param columnInfoFactory Function
 * @param ejs Object
 */
const getTemplate = R.curry((ejs, config, columnInfoFactory, table) => {
    return new Promise((resolve, reject) => {
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
    });
});

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
        variableNames[table.table] = _.camelCase(table.table);
    });

    return render(ejs, `./templates/${config['migrationLib']}-dependencies.ejs`, { tables, variableNames });
}

/**
 * @param {Object} ejs
 * @param {Object} config
 * @param {Array} viewTables
 */
const getViewTablesTemplate = R.curry(async (ejs, config, viewTables) => 
    render(ejs, `./templates/${config['migrationLib']}-view-tables.ejs`, { viewTables }));
    

/**
 * @param {Object} ejs
 * @param {Object} config
 * @param {Array} procedures
 */
const getProcedureTemplate = R.curry((ejs, config, procedures) =>
    render(ejs, `./templates/${config['migrationLib']}-procedures.ejs`, { procedures }));

/**
 * @param {Object} ejs
 * @param {Object} config
 * @param {Object} triggersByTables
 */
const getTriggersTemplate = R.curry((ejs, config, triggersByTables) =>
    render(ejs, `./templates/${config['migrationLib']}-triggers.ejs`, { triggersByTables }));

/**
 * @param content String
 * @param tableName String
 * @param config Object
 * @param fs Object
 * @param timestamp int
 * @return String
 */
const generateFile = R.curry((fs, config, fileName, content) =>
    new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(`${config.output}/${fileName}`, { highWaterMark: Math.pow(2, 16) });

        ws.write(content);
        ws.end();
        resolve(fileName);
    }));

const getClassName = 
    R.compose(
        R.concat('Create'),
        R.compose(R.concat(R.__, 'Table'), R.join(''), R.map(strUtils.toUpperFirst), R.split('_'))
    )

/**
 * @param tableName String
 * @return String
 */
const getVariableName = tableName => strUtils.camelCase(tableName);


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