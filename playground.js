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
const createTypeMapper = require('./database/type-mapper/factory');
const utils = require('./utils/utils');

const typeMapper = createTypeMapper(config.migrationLib);

const connection = mysql.createConnection({
    host: config.host || 'localhost',
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || 'root',
    database: config.database
});

let ci = createColumnInfo({ Type: 'INT (11)'});
console.log(ci.getType());

ci = createColumnInfo({ Type: 'INT (10) UNSIGNED'});
console.log(ci.getType());