const MongoClient = require('mongodb').MongoClient;
const _ = require('lodash');

const query = require('../../database/query');
const queryProcess = require('../../business/query-process');
const connection = require('../../database/connection');
const config = require('../../config.json');

const url = 'mongodb://localhost:27017/migration-generator';

MongoClient.connect(url, (err, db) => {
    if (err) throw err;

    query.getTables(connection, config, queryProcess.mapTables)
        .then(tables => {
            getCachedTables(db, config)
                .then(cachedTables => {
                    if (cachedTables.length === 0) {
                        initTables(db, config, tables)
                            .then(console.log)
                            .catch(console.log);
                    } else {
                        const cachedTableNames = cachedTables.map(t => t.name);
                        console.log(_.difference(tables, cachedTableNames));
                    }
                });
        })
        .catch(console.log);
});

const getCachedTables = (db, config) => {
    return new Promise((resolve, reject) => {
        db.collection('tables').find({ database: config.database }).toArray((err, docs) => {
            if (err) return reject(err);

            resolve(docs);
        });
    });
}

const initTables = (db, config, tables) => {
    return new Promise((resolve, reject) => {
        const mappedTables = tables.map(t => ({ name: t, database: config.database }));

        db.collection('tables').insertMany(mappedTables, (err, result) => {
            if (err) return reject(err);

            resolve(result);
        });
    });
}