const fs = require('fs');
const ejs = require('ejs');
const _ = require('lodash');

const createColumnInfo = require('./database/column-info/factory');
const createTypeMapper = require('./database/type-mapper/factory');
const migration = require('./database/migration');

const config = require('./config.json');
const typeMapper = createTypeMapper(config.migrationLib);

const mysql = require('mysql');
const connection = mysql.createConnection({
    host: config.host || 'localhost',
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || 'root',
    database: config.database
});

connection.connect();

const tableKey = `Tables_in_${config.database}`;
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
                        INFORMATION_SCHEMA.KEY_COLUMN_USAGE.REFERENCED_TABLE_SCHEMA = '${config.database}' AND
                        INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS.CONSTRAINT_SCHEMA = '${config.database}' AND
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
        let orderedMigrations = migration.getOrderedMigrations(res);
        let tables = orderedMigrations.map(o => o.table);

        /**
         * @todo wtf
         */
        orderedMigrations
            .filter(m => m !== undefined)
            .forEach(m => {
                let fileName = `${(new Date).getTime()}_create_${m.table}_table.php`;
                let path = `${config.output}/${fileName}`;

                fs.writeFileSync(path, m.html);            
                console.log(`${fileName} was generated successfully`);                
            });
    })
    .catch(err => {
        console.log(err);
        process.exit(-1);
    });