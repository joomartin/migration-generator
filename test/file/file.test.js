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
            let fs = {
                writeFile(path, content, callback) {
                    expect(path).to.be.equal(`/output/${timestamp}_create_todos_table.php`);
                    callback(undefined);
                }
            }

            file.generateFile(content, `${timestamp}_create_todos_table.php`, config, fs)
                .then(fileName => {
                    expect(fileName).to.be.equal(`${timestamp}_create_todos_table.php`);
                })
        });
    });

    describe('#getTemplate()', () => {
        it('should get template for a table', () => {
            let config = {
                migrationLib: 'phinx'
            }

            let createColumnInfo = field => ({
                isPrimaryKey() {
                    return true;
                },
                getType() {
                    return {name: 'INTEGER'};
                },
                getOptions() {
                    return {unsigned: true};
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

            let typeMapper = {
                map() {
                    return 'int';
                }
            }

            file.getTemplate(table, typeMapper, config, createColumnInfo, ejs)
                .then(data => {
                    expect(data.table).to.be.equal('todos');
                })
        });
    });

    describe('#getForeignKeyTemplate()', () => {
        it('should get template for foreign key migration', (done) => {
            let config = {
                migrationLib: 'phinx'
            }

            let tables = {
                'todos': {},
                'categories': {}
            }

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
});