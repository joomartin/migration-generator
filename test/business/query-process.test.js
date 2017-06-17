const expect = require('chai').expect;
const _ = require('lodash');

const strUtils = require('../../utils/str');
const queryProcess = require('../../business/query-process');

describe('QueryProcess', () => {
    describe('#filterExcluededTables', () => {
        const config = {
            excludedTables: ['migrations']
        };
        const tables = [
            'migrations', 'table1', 'table2'
        ];
        const expectResult = (result) => {
            expect(result.length).to.be.eq(2);
            expect(result).to.be.deep.eq(['table1', 'table2'])
        };

        it('should return filtered tables based on config excluded tables property', () => {
            expectResult(queryProcess.filterExcluededTables(config, tables));
        });

        it('should be curried', () => {
            expectResult(queryProcess.filterExcluededTables(config)(tables));
        });
    });

    describe('#mapTables', () => {
        const config = { database: 'database' };
        const tables = [
            { 'Tables_in_database': 'table1' }, { 'Tables_in_database': 'table2' }, { 'Tables_in_database': 'table3' }
        ];
        const expectResult = result => {
            expect(result).to.deep.equal([
                'table1', 'table2', 'table3',
            ]);
        }

        it('should map an array containing mysql results to an array contains table names', () => {
            expectResult(queryProcess.mapTables(config, tables));
        });

        it('should be curries', () => {
            expectResult(queryProcess.mapTables(config)(tables));
        });
    });

    describe('#sanitizeViewTables()', () => {
        it('should sanitize given view tables', () => {
            const viewTables = [
                { VIEW_DEFINITION: 'view table #1' }, { VIEW_DEFINITION: 'view table #2' }
            ];
            const definitions = viewTables.map(vt => vt.VIEW_DEFINITION);
            const database = 'test-database';

            const sanitized = queryProcess.sanitizeViewTables(
                database, viewTables);

            expect(sanitized.length).to.be.equal(viewTables.length);
        });
    });

    describe('#replaceDatabaseInContent()', () => {
        it('should return the given content, without the given database name', () => {
            const content = 'SELECT * FROM `test-database`.`test-table`';
            const database = 'test-database';

            const replaced = queryProcess.replaceDatabaseInContent(database, content);
            expect(replaced).to.be.equal('SELECT * FROM `test-table`');
        });
    });

    describe('#filterIndexes()', () => {
        it('should return all indexes from an array of columns', () => {
            const columns = [
                { Field: 'id', Key: 'PRI' }, { Field: 'name' },
                { Field: 'user_id', Key: 'MUL' }, { Field: 'serial', Key: 'UNI' }
            ];

            const indexes = queryProcess.filterIndexes(columns);

            expect(indexes.length).to.be.equal(2);
            expect(indexes).to.be.deep.equal([
                { Field: 'user_id', Key: 'MUL' }, { Field: 'serial', Key: 'UNI' }
            ]);
        });
    });

    describe('#escapeRows()', () => {
        it('should foreach rows and escape string content', () => {
            const rows = [
                { id: 1, name: 'Item #1', user_id: 12 }, { id: 2, name: 'Item #2', user_id: 5 },
            ];

            const escaped = queryProcess.escapeRows(rows);

            expect(escaped.length).to.be.equal(2);
        });
    });

    describe('#normalizeProcedureDefinition()', () => {
        it('should escape definition and map to an object', () => {
            const definition = {
                'Procedure': 'Procedure_Name',
                'Create Procedure': "Procedure body 'quotes' here"
            };
            const procedure = {
                definition,
                type: 'PROCEDURE'
            };

            const normalizedProcedureDefinition = queryProcess.normalizeProcedureDefinition(procedure);
            expect(normalizedProcedureDefinition.type).eq('PROCEDURE');
            expect(normalizedProcedureDefinition.definition).eq("Procedure body \\'quotes\\' here");
            expect(normalizedProcedureDefinition.name).eq('Procedure_Name');
        });
    });

    describe('#mapTriggers()', () => {
        it('should escape quotes and map triggers to an array of objects', () => {
            const triggers = [
                {
                    Trigger: 'trigger1', Event: 'INSERT', Timing: 'AFTER',
                    Statement: "SET @foo = 1 some 'quotes'", Definer: 'root@localhost', Table: 'todos'
                }
            ];

            const mappedTriggers = queryProcess.mapTriggers('database', triggers);
            expect(mappedTriggers.todos).to.be.deep.equal([
                {
                    name: 'trigger1',
                    event: 'INSERT',
                    timing: 'AFTER',
                    statement: "SET @foo = 1 some \\'quotes\\'",
                    definer: 'root@localhost',
                    table: 'todos',
                    database: 'database'
                }
            ]);
        });
    });

    describe('#parseDependencies()', () => {
        it('should return an array of objects that contains all foreign keys and meta data for a table', () => {
            const dependencies = queryProcess.parseDependencies('todos', createTable);

            expect(dependencies).to.be.lengthOf(2);
            expect(dependencies).to.be.deep.equal([
                {
                    sourceTable: 'todos',
                    sourceColumn: 'category_id',
                    referencedTable: 'categories',
                    referencedColumn: 'id',
                    updateRule: 'NO ACTION',
                    deleteRule: 'SET NULL'
                }, {
                    sourceTable: 'todos',
                    sourceColumn: 'user_id',
                    referencedTable: 'users',
                    referencedColumn: 'id',
                    updateRule: 'SET NULL',
                    deleteRule: 'CASCADE'
                },
            ]);
        });

        it('should return return an empty array if no foreign key in table', () => {
            const dependencies = queryProcess.parseDependencies('todos', createTableNoForeignKeys);

            expect(dependencies).to.be.lengthOf(0);
        });
    });

});

const createTable = "CREATE TABLE `todos` ( `id` int(11) unsigned NOT NULL AUTO_INCREMENT, `title` varchar(100) DEFAULT NULL, `category_id` int(11) unsigned DEFAULT NULL, `hours` decimal(10,2) unsigned DEFAULT NULL, `description` longtext, `is_done` tinyint(1) DEFAULT NULL, `unique_id` tinyint(1) DEFAULT NULL, `user_id` int(11) unsigned DEFAULT NULL, PRIMARY KEY (`id`), UNIQUE KEY `unique_id` (`unique_id`), KEY `category_id` (`category_id`), KEY `is_done` (`is_done`), KEY `user_id` (`user_id`), CONSTRAINT `todos_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT `todos_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE SET NULL ) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8";
const createTableNoForeignKeys = "CREATE TABLE `users` ( `id` int(11) unsigned NOT NULL AUTO_INCREMENT, `name` varchar(100) DEFAULT 'user', `ratings` decimal(10,2) DEFAULT '10.00', PRIMARY KEY (`id`) ) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8";