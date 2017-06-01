const query = require('./database/query');
const mysql = require('mysql');
const ejs = require('ejs');
const fs = require('fs');
const util = require('util');
const _ = require('lodash');
const chalk = require('chalk');

const config = require('./config.json');
const file = require('./file/file');

const createColumnInfo = require('./database/column-info/factory');
const ColumnInfoPhinx = require('./database/column-info/column-info-phinx');
const utils = require('./utils/utils');
const queryProcess = require('./business/query-process');

const connection = mysql.createConnection({
    host: config.host || 'localhost',
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || 'root',
    database: config.database
});

const sanitizeViewTables = (_, database, replaceDatabaseNameFn, escapeQuotesFn, viewTables) =>
    viewTables.map(vt => {
        let viewTable = _.clone(vt);
        viewTable.VIEW_DEFINITION = replaceDatabaseNameFn(
            database, escapeQuotesFn(vt.VIEW_DEFINITION));

        return viewTable;
    });

const sanitizeViewTablesFactory = (_, database, replaceDatabaseNameFn, escapeQuotesFn) =>
    sanitizeViewTables.bind(null, _, database, replaceDatabaseNameFn, escapeQuotesFn);

const getViewTables = (connection, sanitizeFn) => {
    return new Promise((resolve, reject) => {
        connection.query(`SELECT * FROM information_schema.views WHERE TABLE_SCHEMA = '${connection.config.database}'`, (err, viewTablesRaw) => {
            if (err) return reject(err);

            resolve(sanitizeFn(viewTablesRaw));
        });
    });
}

const sanitizeFn = sanitizeViewTablesFactory(
    _, connection.config.database, queryProcess.replaceDatabaseInContent, utils.escapeQuotes);

getViewTables(connection, sanitizeFn)
    .then(console.log)
    .catch(console.log);