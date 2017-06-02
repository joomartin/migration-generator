const expect = require('chai').expect;

const file = require('../../file/file');

describe('File', () => {
    describe('#getClassName()', () => {
        it('should get the migration class name from a table name', () => {
            let className = file.getClassName('todos');
            expect(className).to.be.equal('CreateTodosTable');

            className = file.getClassName('todos_users');
            expect(className).to.be.equal('CreateTodosUsersTable');

            className = file.getClassName('todos_users_categories');
            expect(className).to.be.equal('CreateTodosUsersCategoriesTable');
        });
    });

    describe('#getVariableName()', () => {
        it('should get the migration variable name from a table name', () => {
            let className = file.getVariableName('todos');
            expect(className).to.be.equal('todos');

            className = file.getVariableName('todos_users');
            expect(className).to.be.equal('todosUsers');

            className = file.getVariableName('todos_users_categories');
            expect(className).to.be.equal('todosUsersCategories');
        });
    });

    describe('#generateFile()', () => {
        it('should write out content to a file', () => {
            let content = 'foo';
            let tableName = 'todos';
            let config = {
                output: '/output'
            };
            let timestamp = (new Date).getTime();
            let writeStream = {
                write(content, options) {
                    
                },
                end() {
                    expect(true).to.be.true;
                }
            };

            let fs = {
                createWriteStream(path, options) {
                    expect(path).to.be.include(config.output);                    
                    expect(path).to.be.include('create_todos_table.php');    

                    return writeStream;                
                }
            }

            file.generateFile(content, `${timestamp}_create_todos_table.php`, config, fs)
                .then(fileName => {
                    expect(fileName).to.be.equal(`${timestamp}_create_todos_table.php`);
                })
        });
    });

    describe('#getTemplate()', () => {
        it('should get template for a table', (done) => {
            let config = {
                migrationLib: 'phinx'
            }

            let columnInfoFactory = field => ({
                isPrimaryKey() {
                    return true;
                },
                getType() {
                    return {name: 'INT'};
                },
                getOptions() {
                    return {unsigned: true};
                },
                mapType(nativeType) {
                    return 'integer';
                }
            });

            let table = {
                table: 'todos',
                columns: [
                    {Field: 'id'}
                ]
            }

            let ejs = {
                renderFile(path, data, options, callback) {
                    expect(path).to.be.equal(`./templates/phinx.ejs`);
                    expect(data.table).to.be.equal('todos');

                    callback(undefined, 'html content');
                }
            }

            file.getTemplate(table, config, columnInfoFactory, ejs)
                .then(data => {
                    expect(data.table).to.be.equal('todos');
                    done();
                })
        });
    });

    describe('#getForeignKeyTemplate()', () => {
        it('should get template for foreign key migration', (done) => {
            let config = {
                migrationLib: 'phinx'
            };

            let tables = [
                {table: 'todos'},
                {table: 'categories'}
            ];

            let ejs = {
                renderFile(path, data, options, callback) {
                    expect(path).to.be.equal(`./templates/phinx-dependencies.ejs`);
                    expect(data.tables).to.be.equal(tables);

                    callback(undefined, 'html content');
                }
            }

            file.getForeignKeyTemplate(tables, config, ejs)
                .then(data => {
                    expect(data).to.be.equal('html content');
                    done();
                })
                .catch(err => console.log(err));
                
        });
    });

    describe('#getViewTablesTemplate()', () => {
        it('should get template for view tables', (done) => {
            let config = {
                migrationLib: 'phinx'
            }

            let tables = {
                'todos': {},
                'categories': {}
            }

            let ejs = {
                renderFile(path, data, options, callback) {
                    expect(path).to.be.equal(`./templates/phinx-view-tables.ejs`);
                    expect(data.viewTables).to.be.equal(tables);

                    callback(undefined, 'html content');
                }
            }

            file.getViewTablesTemplate(tables, config, ejs)
                .then(data => {
                    expect(data).to.be.equal('html content');
                    done();
                })
                .catch(err => console.log(err));
        });
    });

    describe('#getProcedureTemplate()', () => {
        it('should get template for procedures', (done) => {
            const procedures = [
                { name: 'proc1' }
            ];
            const config = {
                migrationLib: 'phinx'
            };
            const ejs = {
                renderFile(path, options, obj, callback) {
                    expect(path).to.be.equal('./templates/phinx-procedures.ejs');
                    expect(options).to.include({ procedures });
                    callback(null, 'html content');
                }
            };

            file.getProcedureTemplate(procedures, config, ejs)
                .then(html => {
                    expect(html).to.be.equal('html content');
                    done();
                })
                .catch(console.log);
        });
    });

    describe('#getTriggersTemplate()', () => {
        it('should get template for triggers', (done) => {
            const triggers = [
                { name: 'proc1' }
            ];
            const config = {
                migrationLib: 'phinx'
            };
            const ejs = {
                renderFile(path, options, obj, callback) {
                    expect(path).to.be.equal('./templates/phinx-triggers.ejs');
                    expect(options).to.include({ triggersByTables: triggers });
                    callback(null, 'html content');
                }
            };

            file.getTriggersTemplate(triggers, config, ejs)
                .then(html => {
                    expect(html).to.be.equal('html content');
                    done();
                })
                .catch(console.log);
        });
    });

    describe('#getFileNames()', () => {
        it('should get file names', () => {
            const tables = [{table: 'table 1'}];
            const padIndex = (index) => index;
            const fileMock = {
                getFileName() {
                    expect(true).to.be.true;
                }
            };

            file.getFileNames(null, tables, fileMock, padIndex);
        });
    });

    describe('#getFileName()', () => {
        it('should get file names', () => {
            const table = 'table1';
            const index = 1;

            const fileName = file.getFileName(null, table, index);
            expect(fileName).to.include('1_create_table1_table.php');
        });
    });
});