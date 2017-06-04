const MongoClient = require('mongodb').MongoClient;
const _ = require('lodash');

const query = require('../../database/query');
const queryProcess = require('../../business/query-process');
const connection = require('../../database/connection');
const config = require('../../config.json');
const utils = require('../../utils/utils');

const url = 'mongodb://localhost:27017/migration-generator';

MongoClient.connect(url, (err, db) => {
    if (err) throw err;

    let allTables = [];
    let allCachedTables = [];

    query.getTables(connection, config, queryProcess.mapTables)
        .then(utils.sideEffect(tables => allTables = tables))
        .then(tables => getCachedTables(db, config))
        .then(cachedTables => {
            return cachedTables.length === 0
                ? tables : _.difference(allTables, cachedTables.map(t => t.name));
        })
        .then(tablesToInsert => insertTables(db, config, tablesToInsert))
        .then(console.log)
        .catch(console.log);
});

/**
 * @param {Object} db 
 * @param {Object} config 
 */
const getCachedTables = (db, config) => {
    return new Promise((resolve, reject) => {
        db.collection('tables').find({ database: config.database }).toArray((err, docs) => {
            if (err) return reject(err);

            resolve(docs);
        });
    });
}

/**
 * @param {Object} db 
 * @param {Object} config 
 * @param {Array} tables 
 */
const insertTables = (db, config, tables) => {
    return new Promise((resolve, reject) => {
        if (tables.length === 0) return resolve(true);
        const mappedTables = tables.map(t => ({ name: t, database: config.database }));

        db.collection('tables').insertMany(mappedTables, (err, result) => {
            if (err) return reject(err);

            resolve(result);
        });
    });
}