const fs = require('fs');
const yargs = require('yargs');
const ejs = require('ejs');
const _ = require('lodash');

const createColumnInfo = require('./database/column-info/factory');
const createTypeMapper = require('./database/type-mapper/factory');

const config = require('./config.json');
const typeMapper = createTypeMapper(config.migrationLib);

const argv = yargs
    .options({
        d: {
            alias: 'database',
            describe: 'Database to get tables information from',
            string: true,
            demand: true
        },
        o: {
            alias: 'output',
            describe: 'Output path where files being generated',
            string: true,
            demand: true
        }
    })
    .help()
    .alias('help', 'h')
    .argv;

const mysql = require('mysql');
const connection = mysql.createConnection({
    host: config.host,
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || 'root',
    database: argv.database
});

connection.connect();
const tableKey = `Tables_in_${argv.database}`;
let migrations = {};

function getMigrations() {
    return new Promise((resolve, reject) => {
        connection.query('SHOW TABLES', (err, tablesRaw) => {
            if (err) return reject(err);

            const tables = tablesRaw
                .filter(t => !config.excludedTables.includes(t[tableKey]));

            tables.forEach(function (element, index) {
                const table = element[tableKey];
                migrations[table] = {
                    table,
                    allDependencyOrdered: false
                };

                const tableParts = table.split('_');
                const tablePartsUpper = tableParts
                    .map(tp => tp.charAt(0).toUpperCase() + tp.slice(1));

                const columnsQuery = `SHOW FULL COLUMNS FROM ${table}`;
                const migrationClass = `Create${tablePartsUpper.join('')}Table`;

                const dependenciesQuery = `
                    SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE        
                    LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
                    ON INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS.CONSTRAINT_NAME = INFORMATION_SCHEMA.KEY_COLUMN_USAGE.CONSTRAINT_NAME
                    
                    WHERE
                        INFORMATION_SCHEMA.KEY_COLUMN_USAGE.REFERENCED_TABLE_SCHEMA = '${argv.database}' AND
                        INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS.CONSTRAINT_SCHEMA = '${argv.database}' AND
                        INFORMATION_SCHEMA.KEY_COLUMN_USAGE.TABLE_NAME = '${table}';
                `;

                connection.query(dependenciesQuery, (err, results) => {
                    if (err) return reject(err);

                    dependencies = results.map(r => {
                        return {
                            sourceTable: r['TABLE_NAME'],
                            sourceColumn: r['COLUMN_NAME'],
                            referencedTable: r['REFERENCED_TABLE_NAME'],
                            referencedColumn: r['REFERENCED_COLUMN_NAME'],
                            updateRule: r['UPDATE_RULE'],
                            deleteRule: r['DELETE_RULE']
                        };
                    });

                    migrations[table].dependencies = _.uniqBy(dependencies, 'sourceColumn');
                });

                connection.query(columnsQuery, (err, fields) => {
                    if (err) return reject(err)

                    const variableName = _.camelCase(table);
                    let primaryKey = null;

                    const fieldsData = fields.map(f => {
                        const columnInfo = createColumnInfo(f);
                        const options = columnInfo.getOptions();

                        if (columnInfo.isPrimaryKey()) {
                            primaryKey = f['Field'];
                        }

                        let typeObj = columnInfo.getType();
                        typeObj.name = typeMapper.map(typeObj.name);

                        return {
                            name: f['Field'],
                            type: typeObj,
                            table, options, variableName
                        };
                    });

                    ejs.renderFile(`./templates/${config['migrationLib']}.ejs`, {
                        migrationClass, table,
                        columns: fieldsData,
                        variableName, primaryKey,
                        dependencies: migrations[table].dependencies
                    }, null, (err, html) => {
                        if (err) throw err;
                        
                        migrations[table].html = html; 
                    });

                    if (migrations[table].dependencies.length === 0) {
                        migrations[table].allDependencyOrdered = true;
                    }

                    if (index === tables.length - 1) {
                        resolve(migrations);
                    }
                });
            });

            connection.end();
        });
    });
}

getMigrations()
    .then(res => {
        // let orderedMigrations = getOrderedMigrations(res);

        for (table in res) {
            let fileName = `${(new Date).getTime()}_create_${res[table].table}_table.php`;
            let path = `${argv.output}/${fileName}`;
            
            fs.writeFile(path, res[table].html, err => {
                if (err) throw err;
                console.log(`${fileName} was generated successfully`);
            });
        }

        /**
         * @todo wtf
         */
        // orderedMigrations
        //     .filter(m => m !== undefined)
        //     .forEach(m => {
        //         let fileName = `${(new Date).getTime()}_create_${m.table}_table.php`;
        //         let path = `${argv.output}/${fileName}`;
                
        //         fs.writeFile(path, m.html, err => {
        //             if (err) throw err;
        //             console.log(`${fileName} was generated successfully`);
        //         });
        //     });
    })
    .catch(err => {
        console.log(err);
        process.exit(-1);
    });

function getOrderedMigrations(migrations) {
    let orderedMigrations = [];
    while (!allTablesOrdered(migrations)) {
        for (table in migrations) {
            if (!hasTable(orderedMigrations, table) 
                && _.get(migrations, table, {allDependencyOrdered: false}).allDependencyOrdered) {

                orderedMigrations.push(migrations[table]);
            }

            _.get(migrations[table], 'dependencies', []).forEach((dependency) => {
                if (!hasTable(orderedMigrations, table)) {
                    if (!hasTable(orderedMigrations, dependency.referencedTable)) {
                        orderedMigrations.unshift(migrations[dependency.referencedTable]);
                    }
                }

                migrations[table].allDependencyOrdered = true;
                if (!hasTable(orderedMigrations, table)) {
                    orderedMigrations.push(migrations[table]);
                }
            });
        }
    }

    let filtered = orderedMigrations.filter(m => m !== undefined);
    return _.uniqBy(filtered, 'table')
}

function allTablesOrdered(migrations) {
    for (table in migrations) {
        if ( !_.get(migrations, table, {allDependencyOrdered: false}).allDependencyOrdered) {
            return false;
        }
    }

    return true;
}

function hasTable(migrations, table) {
    return migrations.some(m => _.get(m, table, null) === table);
}