const fs = require('fs');
const yargs = require('yargs');
const Handlebars = require('handlebars');

const config = require('./config.json');

const template = Handlebars.compile(
    fs.readFileSync(`./templates/${config['migration-lib']}.hbs`)
        .toString());

const argv = yargs
    .options({
        d: {
            alias: 'database',
            describe: 'Database to get column informations',
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
    user: config.user || 'root',
    password: config.password || 'root',
    database: argv.database
});

connection.connect();
const tableKey = `Tables_in_${argv.database}`;

connection.query('SHOW TABLES', (err, tablesRaw) => {
    if (err) throw err;

    const tables = tablesRaw
        .filter(t => !config.excludedTables.includes(t[tableKey]));

    tables.forEach(function(element) {
        const table = element[tableKey];
        const tableParts = table.split('_');
        const tablePartsUpper = tableParts
            .map(tp => tp.charAt(0).toUpperCase() + tp.slice(1));

        const query = `SHOW FULL COLUMNS FROM ${table}`;
        const migrationClass = `Create${tablePartsUpper.join('')}Table`;        

        connection.query(query, (err, fields) => {
            if (err) throw err;

            const filedsData = fields.map(f => {
                /**
                 * @todo tipus mappeles
                 */
                return {
                    name: f['Field'],
                    type: f['Type'],
                    table
                };
            });

            const html = template({
                migrationClass, table,
                columns: filedsData
            });

            console.log(html);
        });
        
    });

    connection.end();
});