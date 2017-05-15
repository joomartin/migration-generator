const _ = require('lodash');

/**
 * @param migrations Object
 * @return Array
 */
function getOrderedMigrations(migrations) {
    let orderedMigrations = [];
    let lastIndex = 0;

    while ( !allTablesOrdered(migrations)) {
        for (table in migrations) {
            if ( !hasTable(orderedMigrations, table) 
                && _.get(migrations, [table, 'dependencies'], []).length === 0) {
                    
                orderedMigrations.unshift(migrations[table]);
                lastIndex++;
            }

            if ( !hasTable(orderedMigrations, table)
                && _.get(migrations, table, { allDependencyOrdered: false }).allDependencyOrdered) {

                orderedMigrations.splice(lastIndex, 0, migrations[table]);
            }

            _.get(migrations[table], 'dependencies', []).forEach((dependency) => {
                if ( !hasTable(orderedMigrations, table)) {
                    if ( !hasTable(orderedMigrations, dependency.referencedTable)) {
                        orderedMigrations.splice(lastIndex, 0, migrations[dependency.referencedTable]);
                    }
                }

                migrations[table].allDependencyOrdered = true;
                if ( !hasTable(orderedMigrations, table)) {
                    orderedMigrations.push(migrations[table]);
                }
            });
        }
    }

    let filtered = orderedMigrations.filter(m => m !== undefined);
    return _.uniqBy(filtered, 'table');
}

/**
 * @param migrations Object
 * @return bool
 */
function allTablesOrdered(migrations) {
    for (table in migrations) {
        if (!_.get(migrations, table, { allDependencyOrdered: false }).allDependencyOrdered) {
            return false;
        }
    }

    return true;
}

/**
 * @param migrations Array
 * @param table String
 * @return bool
 */
function hasTable(migrations, table) {
    return migrations.some(m => _.get(m, table, null) === table);
}

module.exports = {
    getOrderedMigrations,
    hasTable,
    allTablesOrdered
}