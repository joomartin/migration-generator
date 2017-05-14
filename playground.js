let migrations = {
    todos: {
        allDependencyOrdered: false
    },
    users: {
        allDependencyOrdered: true
    }
}

console.log(allTablesOrdered(migrations));

function allTablesOrdered(migrations) {
    for (table in migrations) {
        if (!migrations[table].allDependencyOrdered) {
            return false;
        }
    }

    return true;
}