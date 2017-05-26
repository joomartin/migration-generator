const query = require('./database/query');
const mysql = require('mysql');
const ejs = require('ejs');
const fs = require('fs');
const util = require('util');

const config = require('./config.json');
const file = require('./file/file');

const connection = mysql.createConnection({
    host: config.host || 'localhost',
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || 'root',
    database: config.database
});

query.getViewTables(connection, query.escapeJsonContent)
    .then(res => {
        console.log(res);
        connection.end();
    })
    .catch(err => (console.log(err)));
