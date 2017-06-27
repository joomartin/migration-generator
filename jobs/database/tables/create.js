const MongoClient = require('mongodb').MongoClient;
const _ = require('lodash');
const { curry, difference, tap, map, prop, __ } = require('ramda');

const connection = require('../../../database/connection');
const config = require('../../../config.json');
const { getTables } = require('../../../database/query');
const { mapTables } = require('../../../business/query-process');

const url = 'mongodb://localhost:27017/migration-generator';

// queryGenerator :: String -> Object -> String -> Promise
const queryGenerator = curry((db, queryType, queryObj, collection) =>
    new Promise((resolve, reject) =>
        db.collection(collection)[queryType](queryObj).toArray((err, docs) => 
            err ? reject(err) : resolve(docs))));

const run = () =>
    new Promise((resolve, reject) => {
        MongoClient.connect(url, (err, db) => {
            if (err) return reject(err);

            let allTables = [];

            getTables(connection)
                .then(mapTables(config))
                .then(tap(tables => allTables = tables))
                .then(_ => getCachedTables(db, config.database))
                .then(map(prop('name')))
                .then(cachedTables => difference(allTables, cachedTables))
                .then(insertTables(db, config))
                .then(resolve)
                .catch(reject);
        });
    });

// getCachedTables :: Object -> String -> Promise
const getCachedTables = (db, database) => queryGenerator(db, 'find', { database }, 'tables');

/**
 * @param {Object} db 
 * @param {Object} config 
 * @param {Array} tables 
 */
const insertTables = curry((db, config, tables) =>
    new Promise((resolve, reject) => {
        if (tables.length === 0)
            return resolve({ result: { ok: 1, n: 0 } });

        const mappedTables = tables.map(t => ({ name: t, database: config.database }));

        db.collection('tables').insertMany(mappedTables, (err, result) =>
            err ? reject(err) : resolve(result));
    }));

module.exports = {
    run, getCachedTables
}