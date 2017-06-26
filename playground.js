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

const connection = mysql.createConnection({
    host: config.host || 'localhost',
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || 'root',
    database: config.database
});
const createTable = "CREATE TABLE `todos` ( `id` int(11) unsigned NOT NULL AUTO_INCREMENT, `title` varchar(100) DEFAULT NULL, `category_id` int(11) unsigned DEFAULT NULL, `hours` decimal(10,2) unsigned DEFAULT NULL, `description` longtext, `is_done` tinyint(1) DEFAULT NULL, `unique_id` tinyint(1) DEFAULT NULL, `user_id` int(11) unsigned DEFAULT NULL, PRIMARY KEY (`id`), UNIQUE KEY `unique_id` (`unique_id`), KEY `category_id` (`category_id`), KEY `is_done` (`is_done`), KEY `user_id` (`user_id`), CONSTRAINT `todos_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT `todos_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE SET NULL ) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8";

const fileNames = ['first', 'second'];
const result = file.generateFiles(fs, file, config, fileNames, ['asdf', 'fdsa'])
    .then(console.log)
    .catch(console.error);


