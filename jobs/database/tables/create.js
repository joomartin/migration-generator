const MongoClient = require('mongodb').MongoClient;
const _ = require('lodash');

const query = require('../../../database/query');
const queryProcess = require('../../../business/query-process');
const connection = require('../../../database/connection');
const config = require('../../../config.json');
const utils = require('../../../utils/utils');

const url = 'mongodb://localhost:27017/migration-generator';

const run = () => {
    return new Promise((resolve, reject) => {
        MongoClient.connect(url, (err, db) => {
            if (err) throw err;

            let allTables = [];
            let allCachedTables = [];

            query.getTables(connection, config, queryProcess.mapTables)
                .then(utils.sideEffect(tables => allTables = tables))
                .then(tables => getCachedTables(db, config))
                .then(cachedTables => 
                    cachedTables.length === 0
                        ? allTables : _.difference(allTables, cachedTables.map(t => t.name))
                )
                .then(tablesToInsert => insertTables(db, config, tablesToInsert))
                .then(res => resolve(res))
                .catch(err => reject(err));
        });
    });
}

/**
 * @param {Object} db 
 * @param {Object} config 
 */
const getCachedTables = (db, config) => {
    return new Promise((resolve, reject) => {
        db.collection('tables').find({ database: config.database }).toArray((err, docs) => 
            err ? reject(err) : resolve(docs));
    });
}

/**
 * @param {Object} db 
 * @param {Object} config 
 * @param {Array} tables 
 */
const insertTables = (db, config, tables) => {
    return new Promise((resolve, reject) => {
        if (tables.length === 0) 
            return resolve({ result: { ok: 1, n: 0 }});
            
        const mappedTables = tables.map(t => ({ name: t, database: config.database }));

        db.collection('tables').insertMany(mappedTables, (err, result) => 
            err ? reject(err) : resolve(result));
    });
}

module.exports = {
    run
}