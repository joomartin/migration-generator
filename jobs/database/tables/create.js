// const MongoClient = require('mongodb').MongoClient;
const { curry, difference, tap, map, prop, __, composeP } = require('ramda');

const { mongoose } = require('../../../config/mongoose');
const { Table } = require('../../../models/table')
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
        let allTables = [];

        const insertTablesPromise = composeP(
            insertTables(config),
            cachedTables => difference(allTables, cachedTables),
            map(prop('name')),
            _ => getCachedTables(config.database),
            tap(tables => allTables = tables),
            mapTables(config),
            getTables
        )(connection);

        insertTablesPromise
            .then(resolve)
            .catch(reject);
    });

// getCachedTables :: Object -> String -> Promise
// const getCachedTables = (db, database) => queryGenerator(db, 'find', 'tables', { database });
const getCachedTables = (database) => Table.find({ database });

// insertTables :: Object -> Array -> Promise
const insertTables = curry((config, tables) => {
        if (tables.length === 0)
            return resolve({ result: { ok: 1, n: 0 } });

        const mappedTables = tables.map(t => ({ name: t, database: config.database }));
        return Table.insertMany(mappedTables);

        // db.collection('tables').insertMany(mappedTables, (err, result) =>
        //     err ? reject(err) : resolve(result));
    });

module.exports = {
    run, getCachedTables, insertTables, url
}