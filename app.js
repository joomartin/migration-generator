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

            const fieldsData = fields.map(f => {
                console.log(getType(f['Type']));
                return {
                    name: f['Field'],
                    type: getType(f['Type']),
                    table
                };
            });

            //console.log(fieldsData);
            const html = template({
                migrationClass, table,
                columns: fieldsData
            });

            //console.log(html);
        });
        
    });

    connection.end();
});

const TYPES = [
    {native: 'varchar', mapped: 'string'},
    {native: 'int', mapped: 'integer'},
    {native: 'bigint', mapped: 'biginteger'},
    {native: 'tinyint', mapped: 'integer'},
    {native: 'decimal', mapped: 'decimal'},
];

function mapType(type) {
    return TYPES
        .filter(t => t.native.includes(type))
        .map(t => t.mapped)
        .shift() || type;
}

function getType(type) {
    let parts = type.split('(');
    let length = null;
    let decimals = null;
    let options = {};

    

    if (parts[1] && parts[1].includes(',')) {
        let lengthParts = parts[1].split(',');
        length = lengthParts[0];
        decimals = lengthParts[1].slice(0, lengthParts[1].length - 1).trim();
    } else if(parts[1]) {
        length = parts[1].slice(0, parts[1].length - 1);
    }

    if (parts[1] && parts[1].includes(' ')) {
        let optionsParts = parts[1].split(' ');
        options.unsigned = (optionsParts[1] === 'unsigned');
    }

    return {
        type: mapType(parts[0]),
        length: length && 1, 
        decimals: decimals && 1,
        options
    };
}