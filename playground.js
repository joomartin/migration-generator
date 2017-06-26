const query = require('./database/query');
const mysql = require('mysql');
const ejs = require('ejs');
const fs = require('fs');
const util = require('util');
const _ = require('lodash');
const chalk = require('chalk');
const { Maybe } = require('ramda-fantasy');

const config = require('./config.json');
const file = require('./file/file');

const createColumnInfo = require('./database/column-info/factory');
const ColumnInfoPhinx = require('./database/column-info/column-info-phinx');
const ColumnInfo = require('./database/column-info/column-info');
const utils = require('./utils/utils');
const queryProcess = require('./business/query-process');
const strUtils = require('./utils/str');
const R = require('ramda');
const createTablesJob = require('./jobs/database/tables/create');

const connection = mysql.createConnection({
    host: config.host || 'localhost',
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || 'root',
    database: config.database
});

createTablesJob.run().then(console.log);