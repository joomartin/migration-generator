const { curry, difference, tap, map, prop, __, composeP, compose, objOf } = require('ramda');

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

// insertTables :: Object -> Array -> Promise
const insertTables = curry((config, tables) =>
    compose(
        Table.insertMany,
        map(t => ({ name: t, database: config.database }))
    )(tables));

module.exports = {
    run, getCachedTables, insertTables, MONGO_URL
}