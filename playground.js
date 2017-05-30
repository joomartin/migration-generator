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

const typeMapper = createTypeMapper(config.migrationLib);

const connection = mysql.createConnection({
    host: config.host || 'localhost',
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || 'root',
    database: config.database
});

let tablesPromise = query.getTableData(connection, query, config)
    .then(tables => {
        let promises = [];
        for (table in tables) {
            promises.push(file.getTemplate(tables[table], typeMapper, config, createColumnInfo, ejs));
        }

        Promise.all(promises)
            .then(value => {
                return new Promise((resolve, reject) => {
                    resolve(value)
                });
            });
    })
    .then(data => { 
        console.log('DATA:', data);
        // let fileName = `${(new Date).getTime()}_create_${data.table}_table.php`;
        // file.generateFile(data.html, fileName, config, fs)
    })
    .then(fileName => {
        // util.log(`${fileName} was generated successfully`);
    })
    .catch(err => console.log(err));