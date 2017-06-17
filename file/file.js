const _ = require('lodash');
const ejs = require('ejs');
const R = require('ramda');

const utils = require('../utils/utils');

const getFileNames = (date, tables, file, padIndex) => 
    tables.map((table, index) => file.getFileName(date, table.table, padIndex(index + 1)))

const getFileName = (date, table, index) => 
    `${utils.getDate()}${index}_create_${table}_table.php`;

const getTemplates = R.curry((ejs, file, config, columnInfoFactory, tables) =>  
    Promise.all(tables.map(table => file.getTemplate(table, config, columnInfoFactory, ejs))));

const generateFiles = (contents, fileNames, config, fs, file) => 
    Promise.all(contents.map((content, index) => 
        file.generateFile(content.html, fileNames[index], config, fs)
            .then(file => console.log(`${fileNames[index]} was generated successfully`))
    ));

/**
 * @param table Object
 * @param config Object
 * @param columnInfoFactory Function
 * @param ejs Object
 */
const getTemplate = (table, config, columnInfoFactory, ejs) => {
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
}

const getForeignKeyTemplate = (tables, config, ejs) => {
    return new Promise((resolve, reject) => {
        let variableNames = {};
        tables.forEach(table => {
            variableNames[table.table] = _.camelCase(table.table);
        });

        ejs.renderFile(`./templates/${config['migrationLib']}-dependencies.ejs`, {
            tables, variableNames,
            migrationClass: 'AddForeignKeys'
        }, null, (err, html) => {
            if (err) return reject(err);

            resolve(html);
        });
    });
}

/**
 * @param {Object} ejs
 * @param {Object} config
 * @param {Array} viewTables
 */
const getViewTablesTemplate = R.curry((ejs, config, viewTables) => 
    new Promise((resolve, reject) => {
        ejs.renderFile(`./templates/${config['migrationLib']}-view-tables.ejs`, { viewTables }, null, (err, html) => 
            err ? reject(err) : resolve(html)
        );
    }));

/**
 * @param {Object} ejs
 * @param {Object} config
 * @param {Array} procedures
 */
const getProcedureTemplate = R.curry((ejs, config, procedures) => 
    new Promise((resolve, reject) => {
        ejs.renderFile(`./templates/${config['migrationLib']}-procedures.ejs`, { procedures }, null, (err, html) => 
            err ? reject(err) : resolve(html)
        );
    }));

/**
 * @param {Object} ejs
 * @param {Object} config
 * @param {Object} triggersByTables
 */
const getTriggersTemplate = R.curry((ejs, config, triggersByTables) => 
    new Promise((resolve, reject) => {
        ejs.renderFile(`./templates/${config['migrationLib']}-triggers.ejs`, { triggersByTables }, null, (err, html) => 
            err ? reject(err) : resolve(html)
        );
    }));


/**
 * @param content String
 * @param tableName String
 * @param config Object
 * @param fs Object
 * @param timestamp int
 * @return String
 */
const generateFile = (content, fileName, config, fs) => 
    new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(`${config.output}/${fileName}`, { highWaterMark: Math.pow(2, 16) });

        ws.write(content);
        ws.end();
        resolve(fileName);
    });


/**
 * @param tableName String
 * @return String
 */
const getClassName = (tableName) => {
    const tableNameCamel = tableName
        .split('_')
        .map(tp => tp.charAt(0).toUpperCase() + tp.slice(1))
        .reduce((carry, current) => carry + current);

    return `Create${tableNameCamel}Table`;
}

/**
 * @param tableName String
 * @return String
 */
const getVariableName = (tableName) => _.camelCase(tableName);

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