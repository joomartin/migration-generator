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
const queryProcessFactory = require('./business/query-process-factory');
const strUtils = require('./utils/str');

const connection = mysql.createConnection({
    host: config.host || 'localhost',
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || 'root',
    database: config.database
});

const table = 'todos';
connection.query('SHOW CREATE TABLE `' + table + '`', (err, result) => {
    if (err) return console.log(err);
    const createTable = result[0]['Create Table'];

    const dependencies = queryProcess.getDependenciesFromCreateTableFunctional(_, strUtils.substringFrom, table, createTable); 
    console.log(dependencies);

    connection.end();
});