const fs = require('fs');
const yargs = require('yargs');
const Handlebars = require('handlebars');
const _ = require('lodash');

const config = require('./config.json');

const template = Handlebars.compile(
    fs.readFileSync(`./templates/${config['migration-lib']}.hbs`)
        .toString());

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
    user: config.user ||  'root',
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
                    generated: false
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

                    migrations[table].html = template({
                        migrationClass, table,
                        columns: fieldsData,
                        variableName, primaryKey
                    });

                    migrations[table].fileName = `${argv.output}/${(new Date).getTime()}_create_${table}_table.php`;

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
    .then(res => (generateFiles(res)))
    .catch(err => (console.log(err)));

function getOrderedMigrations(migrations) {
    // Fuggoseg szerint sorrendben adja vissza

    // Veg kell menni egy tabla fuggosegein, tobb szint melyen, admig olyan tablahoz erunk, aminek mar nincsen fuggosege
    // Es folyamatosan eipteni kell a sorrendet

    // Pl.:
    // todos -> categories -> users

    // todos bekerul elso helyre, elindulunk a fuggosegein
    // Megtalaljuk a categories fuggoseget, ez bekerul a todo ele
    // Elindulunk a categories fuggosegein
    // Megtalaljuk a users fuggoseget, az bekerul a categories ele

    // users -> categories -> todos
}

// function generateFiles(migrations) {
//     for (table in migrations) {

//         let generateDependencies = () => {
//             return new Promise((resolve, reject) => {
//                 _.get(migrations[table], 'dependencies', []).forEach((dependency) => {
//                     generateOneFile(dependency.referencedTable, migrations)
//                         .then(res => (resolve(res)))
//                         .catch(err => (reject(err)));
//                 });
//             });
//         };

//         generateDependencies()
//             .then(res => {
//                 generateOneFile(table, migrations)
//                     .then(res => (console.log(res)))
//                     .catch(err => (console.log(res)));
//             })
//             .catch(err => (console.log(err)));

//     }
// }

// function generateOneFile(table, migrations) {
//     console.log(table);
//     return new Promise((resolve, reject) => {
//         if (!migrations[table].dependencies.length || allDependencyGenerated(table, migrations)) {
//             fs.writeFile(migrations[table].fileName, migrations[table].html, err => {
//                 if (err) return reject(err);

//                 migrations[table].generated = true;
//                 //console.log(`${migrations[table].fileName} was generated successfully`);
//                 resolve(table);
//             });
//         }
//     });
// }

// function allDependencyGenerated(table, migrations) {
//     table.dependencies.forEach(d =>  {
//         if (!migrations[d.referencedTable].generated) {
//             return false;
//         }
//     });

//     return true;
// }


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
        .map(t =>  t.mapped)
        .shift() ||  type.toLowerCase();
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
    } else if (parts[1] &&  parts[1].includes(' ')) {    // INT (10) UNSIGNED
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