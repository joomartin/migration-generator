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
            describe: 'Database to get column informations',
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

            const html = template({
                migrationClass, table,
                columns: fieldsData,
                variableName, primaryKey
            });

            const fileName = `${argv.output}/${(new Date).getTime()}_create_${table}_table.php`;

            fs.writeFile(fileName, html, err => {
                if (err) throw err;

                console.log(`${fileName} was generated`);
            });
        });
        
    });

    connection.end();
});

const TYPES = [
    {native: 'varchar', mapped: 'string'},
    {native: 'int', mapped: 'integer'},
    {native: 'bigint', mapped: 'biginteger'},
    {native: 'tinyint', mapped: 'integer'},
    {native: 'decimal', mapped: 'decimal'}
];

function mapNativeType(type) {
    return TYPES
        .filter(t => t.native.includes(type))
        .map(t => t.mapped)
        .shift() || type.toLowerCase();
}

function getOptions(field) {

    /**
     * @todo IDEGEN KULCSOK
     */

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
    } else if (parts[1] && parts[1].includes(' ')) {    // INT (10) UNSIGNED
        let optionsParts = parts[1].split(' ');
        options.unsigned = (optionsParts[1] === 'unsigned');

        length = optionsParts[0].slice(0, optionsParts[0].length - 1);
    } else if(parts[1]) {   // INT (10)
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