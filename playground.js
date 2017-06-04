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

const connection = mysql.createConnection({
    host: config.host || 'localhost',
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || 'root',
    database: config.database
});

let str = '  asdf ';
let trimmed = _(str).trim();
console.log(trimmed);

const table = 'erp_partner';
connection.query('SHOW CREATE TABLE `' + table + '`', (err, result) => {
    if (err) return console.log(err);
    const createTable = result[0]['Create Table'];

    const foreignKeys = substringFrom(createTable, 'CONSTRAINT');
    const tmp = foreignKeys.split('CONSTRAINT');
    const arr = tmp.filter(item => item.trim);

    arr.forEach(line => {
        const tmp = substringFrom(line, 'FOREIGN KEY');
        const rest = _.trimEnd(tmp.slice(0, tmp.indexOf(') ENGINE')));
        const regex = /`[a-z_]*`/g;

        if (rest) {
            console.log('--------');
            console.log(rest);
            let columns = regex.exec(rest);
            let matches = [];

            while (columns !== null) {
                matches.push(columns[0]);
                columns = regex.exec(rest);
            }

            const rules = substringFrom(rest, 'ON DELETE');
            const deleteRule = rules.slice(0, rules.indexOf('ON UPDATE'));
            const updateRule = _.trimEnd(rules.slice(rules.indexOf('ON UPDATE')), ',');

            console.log(_.trim(matches[0], '()`'));
            const obj = {
                sourceTable: table,
                sourceColumn: _.trim(matches[0], '()`'),
                referencedTable: _.trim(matches[1], '()`'),
                referencedColumn: _.trim(matches[2], '()`'),
                updateRule: _.trim(updateRule.slice(9)),
                deleteRule: _.trim(deleteRule.slice(9)) 
            };

            console.log(obj);
        }
    });

    connection.end();
});

const substringFrom = (src, str) => src.substring(src.indexOf(str));