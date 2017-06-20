const expect = require('chai').expect;
const { curry } = require('ramda');

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

            file.getTemplate(ejs, config, columnInfoFactory, table)
                .then(data => {
                    expect(data.table).to.be.equal('todos');
                    done();
                })
        });

        it('should reject if error in renderFile', (done) => {
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

                    callback('ERROR');
                }
            }

            file.getTemplate(ejs, config, columnInfoFactory, table)
                .then(data => {
                    expect(false).to.be.true;
                })
                .catch(err => {
                    expect(err).to.be.equal('ERROR');
                    done();
                });
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

            file.getForeignKeyTemplate(ejs, config, tables)
                .then(data => {
                    expect(data).to.be.equal('html content');
                    done();
                })
                .catch(err => console.log(err));
        });

        it('should reject if error in renderFile', (done) => {
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

                    callback('ERROR');
                }
            }

            file.getForeignKeyTemplate(ejs, config, tables)
                .then(data => {
                    expect(false).to.be.true;
                })
                .catch(err => {
                    expect(err).to.be.equal('ERROR');
                    done();
                });
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

            file.getViewTablesTemplate(ejs, config, tables)
                .then(data => {
                    expect(data).to.be.equal('html content');
                    done();
                })
                .catch(err => console.log(err));
        });

        it('should reject if error in renderFile', (done) => {
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

                    callback('ERROR');
                }
            }

            file.getViewTablesTemplate(ejs, config, tables)
                .then(data => {
                    expect(false).to.be.true;
                })
                .catch(err => {
                    expect(err).to.be.equal('ERROR');
                    done();
                });
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

            file.getProcedureTemplate(ejs, config, procedures)
                .then(html => {
                    expect(html).to.be.equal('html content');
                    done();
                })
                .catch(console.log);
        });

        it('should reject if error in renderFile', (done) => {
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

                    callback('ERROR');
                }
            };

            file.getProcedureTemplate(ejs, config, procedures)
                .then(data => {
                    expect(false).to.be.true;
                })
                .catch(err => {
                    expect(err).to.be.equal('ERROR');
                    done();
                });
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

            file.getTriggersTemplate(ejs, config, triggers)
                .then(html => {
                    expect(html).to.be.equal('html content');
                    done();
                })
                .catch(console.log);
        });

        it('should reject if error in renderFile', (done) => {
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

                    callback('ERROR');
                }
            };

            file.getTriggersTemplate(ejs, config, triggers)
                .then(data => {
                    expect(false).to.be.true;
                })
                .catch(err => {
                    expect(err).to.be.equal('ERROR');
                    done();
                });
        });
    });

    describe('#getFileNames()', () => {
        it('should get file names', () => {
            const tables = [{table: 'table_1'}, {table: 'table_2'}];
            const result = file.getFileNames(tables);

            expect(result[0]).to.include('create_table_1_table.php');
            expect(result[1]).to.include('create_table_2_table.php');
        });
    });

    describe('#getFileName()', () => {
        it('should get file names', () => {
            const table = 'table1';
            const index = 1;

            const fileName = file.getFileName(table, index);
            expect(fileName).to.include('1_create_table1_table.php');
        });
    });

    describe('#getTemplates()', () => {
        it('should call getTemplate', (done) => {
            const tables = ['table1', 'table2'];
            const fileMock = {
                getTemplate: curry((ejs, config, columnInfoFactory, table) => {
                    expect(tables).include(table);
                })
            };

            file.getTemplates(null, fileMock, null, null, tables)
                .then(res => {
                    expect(true).to.be.true;
                    done();
                })
                .catch(console.log);
        });
    });

    describe('#generateFiles()', () => {
        it('should call generateFile', (done) => {
            const contents = [{ html: 'html content1' }];
            const fileNames = ['filename1'];
            const fileMock = {
                generateFile(html) {
                    return new Promise((resolve, reject) => {
                        expect(html).to.be.equal('html content1');
                        resolve(html);
                    })
                }
            }

            file.generateFiles(null, fileMock, null, fileNames, contents)
                .then(res => {
                    expect(true).to.be.true;
                    done();
                })
                .catch(console.log);
        });
    });
});