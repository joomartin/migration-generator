const expect = require('chai').expect;
const app = require('../../database/migration');

describe('#App', () => {
    describe('#getOrderedMigrations()', () => {
        it('should get all migrations in order based on their dependencies', () => {
            let migrations = {
                categories: {
                    table: 'categories',
                    allDependencyOrdered: false,
                    dependencies: [
                        {
                            sourceTable: 'categories',                            
                            referencedTable: 'users',
                            referencedColumn: 'id',
                            updateRule: 'CASCADE',
                            deleteRule: 'CASCADE'
                        }
                    ]
                },
                todos: {
                    table: 'todos',
                    allDependencyOrdered: false,
                    dependencies: [
                        {
                            sourceTable: 'todos',
                            referencedTable: 'categories',
                            referencedColumn: 'id',
                            updateRule: 'CASCADE',
                            deleteRule: 'CASCADE'
                        }
                    ]
                },
                users: {
                    table: 'users',
                    allDependencyOrdered: true,
                    dependencies: []
                }
            };

            let orderedMigrations = app.getOrderedMigrations(migrations);

            expect(orderedMigrations.length).to.be.equal(3);

            expect(orderedMigrations[0].table).to.be.equal('users');
            expect(orderedMigrations[1].table).to.be.equal('categories');
            expect(orderedMigrations[2].table).to.be.equal('todos');
        });
    });
});