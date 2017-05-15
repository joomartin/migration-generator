const expect = require('chai').expect;
const _ = require('lodash');

const migration = require('../../database/migration');

describe('Migration', () => {
    describe('#getOrderedMigrations()', () => {
        it('should get all migrations in order based on their dependencies', () => {
            let orderedMigrations = migration.getOrderedMigrations(createMigrationData());

            verifyOrderedMigrations(orderedMigrations);
        });

        // Regression test
        it('should work independetly from the input order', () => {
            let data = createMigrationData();
            let migrations = { todos: data.todos, users: data.users, categories: data.categories };
            let orderedMigrations = migration.getOrderedMigrations(migrations);

            verifyOrderedMigrations(orderedMigrations);

            data = createMigrationData();
            migrations = { users: data.users, todos: data.todos, categories: data.categories };
            orderedMigrations = migration.getOrderedMigrations(migrations);

            verifyOrderedMigrations(orderedMigrations);

            data = createMigrationData();
            migrations = { users: data.users, categories: data.categories, todos: data.todos };
            orderedMigrations = migration.getOrderedMigrations(migrations);

            verifyOrderedMigrations(orderedMigrations);
        });
    });

    describe('#hasTable()', () => {
        it('should return true when a table is in migrations', () => {
            let tables = [{todos: 'todos'}, {users: 'users'}, {categories: 'users'}, {}];

            let hasTodos = migration.hasTable(tables, 'todos');
            expect(hasTodos).to.be.true;

            let hasUsers = migration.hasTable(tables, 'users');
            expect(hasUsers).to.be.true;
        });

        it('should return false when a table is missing from migrations', () => {
            let tables = [{todos: 'todos'}, {users: 'users'}, {categories: 'users'}, {}];

            let hasDocuments = migration.hasTable(tables, 'documents');
            expect(hasDocuments).to.be.false;
        });
    });

    describe('#allTablesOrdered()', () => {
        it('should return true when all tables are ordered', () => {
            let migrations = createMigrationData();
            for (table in migrations) {
                migrations[table].allDependencyOrdered = true;
            }

            let allOrdered = migration.allTablesOrdered(migrations);

            expect(allOrdered).to.be.true;
        });

        it('should return false when not all tables are ordered', () => {
            let allOrdered = migration.allTablesOrdered(createMigrationData());

            expect(allOrdered).to.be.false;
        });
    });
});

function verifyOrderedMigrations(orderedMigrations) {
    expect(orderedMigrations.length).to.be.equal(3);

    expect(orderedMigrations[0].table).to.be.equal('users');
    expect(orderedMigrations[1].table).to.be.equal('categories');
    expect(orderedMigrations[2].table).to.be.equal('todos');
}

function createMigrationData() {
    return {
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
}