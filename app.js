const fs = require('fs');
const yargs = require('yargs');
const Handlebars = require('handlebars');
const ejs = require('ejs');
const _ = require('lodash');

const config = require('./config.json');

// Handlebars.registerHelper('eq', function(v1, v2, options) {
//   if(v1 === v2) {
//     return options.fn(this);
//   }

//   return options.inverse(this);
// });

// const template = Handlebars.compile(
//     fs.readFileSync(`./templates/${config['migration-lib']}.hbs`)
//         .toString());

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

                const query = `SHOW FULL COLUMNS FROM ${table}`;
                const migrationClass = `Create${tablePartsUpper.join('')}Table`;

                const dependenciesQuery = `
                    SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE        
                    LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
                    ON INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS.CONSTRAINT_NAME = INFORMATION_SCHEMA.KEY_COLUMN_USAGE.CONSTRAINT_NAME
                    
                    WHERE
                        INFORMATION_SCHEMA.KEY_COLUMN_USAGE.REFERENCED_TABLE_SCHEMA = '${argv.database}' AND
                        INFORMATION_SCHEMA.KEY_COLUMN_USAGE.TABLE_NAME = '${table}';
                `;

                connection.query(dependenciesQuery, (err, results) => {
                    if (err) return reject(err);

                    migrations[table].dependencies = results.map(r => {
                        return {
                            sourceTable: r['TABLE_NAME'],
                            sourceColumn: r['COLUMN_NAME'],
                            referencedTable: r['REFERENCED_TABLE_NAME'],
                            referencedColumn: r['REFERENCED_COLUMN_NAME'],
                            updateRule: r['UPDATE_RULE'],
                            deleteRule: r['DELETE_RULE']
                        };
                    });
                });

                connection.query(query, (err, fields) => {
                    if (err) return reject(err)

                    const variableName = _.camelCase(table);
                    let primaryKey = null;

                    const fieldsData = fields.map(f => {
                        const options = getOptions(f);

                        if (isPrimaryKey(f)) {
                            primaryKey = f['Field'];
                        }

                        return {
                            name: f['Field'],
                            type: getType(f['Type']),
                            table, options, variableName
                        };
                    });

                    // console.log(table);
                    // console.log(migrations[table].dependencies);

                    migrations[table].html = ejs.renderFile(`./templates/${config['migration-lib']}.ejs`, {
                        migrationClass, table,
                        columns: fieldsData,
                        variableName, primaryKey,
                        dependencies: migrations[table].dependencies
                    }, null, (err, str) => {
                        if (err) throw err;
                        
                        console.log('render');
                        console.log(str);
                    });

                    return false;

                    // migrations[table].html = template({
                    //     migrationClass, table,
                    //     columns: fieldsData,
                    //     variableName, primaryKey,
                    //     dependencies: migrations[table].dependencies
                    // });

                    migrations[table].fileName = `${argv.output}/${(new Date).getTime()}_create_${table}_table.php`;

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
        //console.log(res);
        let orderedMigrations = getOrderedMigrations(res);
        // console.log(orderedMigrations);

        /**
         * @todo fileName -ben nem jo a sorrendbe allitas elotti timestamp
         */
        orderedMigrations.forEach(m => {
            fs.writeFile(m.fileName, m.html, err => {
                if (err) throw err;
            });
        });
    })
    .catch(err => (console.log(err)));

function getOrderedMigrations(migrations) {
    let orderedMigrations = [];
    while (!allTablesOrdered(migrations)) {
        for (table in migrations) {
            if (!hasTable(orderedMigrations, table) && migrations[table].allDependencyOrdered) {
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

    return orderedMigrations;
}

function allTablesOrdered(migrations) {
    for (table in migrations) {
        if (!migrations[table].allDependencyOrdered) {
            return false;
        }
    }

    return true;
}

function hasTable(migrations, table) {
    return migrations.some(m => m.table === table);
}

const TYPES = [
    { native: 'varchar', mapped: 'string' },
    { native: 'int', mapped: 'integer' },
    { native: 'bigint', mapped: 'biginteger' },
    { native: 'tinyint', mapped: 'integer' },
    { native: 'decimal', mapped: 'decimal' }
];

function mapNativeType(type) {
    return TYPES
        .filter(t => t.native.includes(type))
        .map(t => t.mapped)
        .shift() || type.toLowerCase();
}

function getOptions(field) {
    let options = {};

    if (field['Null'] === 'NO') {
        options['null'] = false;
    }

    if (field['Default']) {
        options['default'] = field['Default'];
    }

    if (field['Key'] === 'UNI') {
        options['unique'] = true;
    }

    return (_.isEmpty(options)) ? null : options;
}

function isPrimaryKey(field) {
    return field['Key'] === 'PRI';
}

function getType(type) {
    let parts = type.split('(');
    let length = null;
    let decimals = null;
    let options = {};

    // DECIMAL (10,2)
    if (parts[1] && parts[1].includes(',')) {
        let lengthParts = parts[1].split(',');
        length = lengthParts[0];
        decimals = lengthParts[1].slice(0, lengthParts[1].length - 1).trim();
    } else if (parts[1] && parts[1].includes(' ')) {    // INT (10) UNSIGNED
        let optionsParts = parts[1].split(' ');
        options.unsigned = (optionsParts[1] === 'unsigned');

        length = optionsParts[0].slice(0, optionsParts[0].length - 1);
    } else if (parts[1]) {   // INT (10)
        length = parts[1].slice(0, parts[1].length - 1);
    }

    /**
     * @todo DECIMAL(10, 2) UNSIGNED
     */

    if (length) {
        options.length = length;
    }

    if (decimals) {
        options.decimals = decimals;
    }

    return {
        type: mapNativeType(parts[0]),
        options
    };
}