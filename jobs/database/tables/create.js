const { curry, difference, tap, map, prop, __, composeP, compose, objOf } = require('ramda');
const { MongoClient } = require('mongodb');

const mongoose = require('../../../config/mongoose');
const { Table } = require('../../../models/table')
const connection = require('../../../database/connection');
const config = require('../../../config.json');
const { getTables } = require('../../../database/query');
const { mapTables } = require('../../../business/query-process');

const MONGO_URL = 'mongodb://localhost:27017/migration-generator';

// run :: void -> Promise
const run = () => {
    let allTables = [];

    return composeP(
        insertTables(config),
        cachedTables => difference(allTables, cachedTables),
        map(prop('name')),
        _ => getCachedTables(config.database),
        tap(tables => allTables = tables),
        mapTables(config),
        getTables
    )(connection);
};

// getCachedTables :: String -> Promise
const getCachedTables = database => Table.find({ database });

// @todo mongoose insertMany
// insertTables :: Object -> [String] -> Promise
const insertTables = curry((config, tables) =>
    new Promise((resolve, reject) => {
        MongoClient.connect(MONGO_URL, (err, db) => {
            const mappedTables = tables.map(t => ({ name: t, database: config.database }));
            if (mappedTables.length) {
                db.collection('tables').insertMany(mappedTables, (err, results) => {
                    db.close();
                    return err ? reject(err) : resolve(results)
                });
            } else {
                db.close();
                return resolve({ result: { n: 0 } });
            }
        });
    }));
// compose(
//     Table.insertMany,
//     tap(console.log),
//     map(t => ({ name: t, database: config.database })),
//     tap(console.log)
// )(tables));

module.exports = {
    run, getCachedTables, insertTables, MONGO_URL
}