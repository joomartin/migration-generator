const query = require('./database/query');
const mysql = require('mysql');
const ejs = require('ejs');
const fs = require('fs');
const util = require('util');
const _ = require('lodash');

const config = require('./config.json');
const file = require('./file/file');

const connection = mysql.createConnection({
    host: config.host || 'localhost',
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || 'root',
    database: config.database
});

query.getTriggers(connection, query.escapeQuotes, _)
    .then(console.log)
    .catch(console.log)