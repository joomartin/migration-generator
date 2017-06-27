const MongoClient = require('mongodb').MongoClient;
const { curry, difference, tap, map, prop, __, composeP } = require('ramda');

const connection = require('../../../database/connection');
const config = require('../../../config.json');
const { getTables } = require('../../../database/query');
const { mapTables } = require('../../../business/query-process');

const url = 'mongodb://localhost:27017/migration-generator';

// queryGenerator :: Object -> String -> String -> Object
const queryGenerator = curry((db, queryType, collection, queryObj) =>
    new Promise((resolve, reject) =>
        db.collection(collection)[queryType](queryObj).toArray((err, docs) => 
            err ? reject(err) : resolve(docs))));

// run :: void -> Promise
const run = () =>
    new Promise((resolve, reject) => {
        MongoClient.connect(url, (err, db) => {
            if (err) return reject(err);

            let allTables = [];

            const insertTablesPromise = composeP(
                insertTables(db, config),
                cachedTables => difference(allTables, cachedTables),
                map(prop('name')),
                _ => getCachedTables(db, config.database),
                tap(tables => allTables = tables),
                mapTables(config),
                getTables
            )(connection);

            insertTablesPromise
                .then(resolve)
                .catch(reject);
        });
    });

// getCachedTables :: Object -> String -> Promise
const getCachedTables = (db, database) => queryGenerator(db, 'find', 'tables', { database });

// insertTables :: Object -> Object -> Array -> Promise
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