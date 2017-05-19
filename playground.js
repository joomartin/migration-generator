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

query.getProcedures(connection, query.convertProceduresToObjects)
    .then(procedures => {
        file.getProcedureTemplate(procedures, config, ejs)
            .then(html => {
                let fileName = `${(new Date).getTime()}_procedures_and_functions.php`;
                file.generateFile(html, fileName, config, fs)
                    .then(fileName => {
                        util.log(`${fileName} was generated successfully`);
                    })
                    .catch(err => console.log(err));
            })
            .catch(err => console.log(err));
    })
    .catch(err => (console.log(err)));
