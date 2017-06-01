const queryProcess = require('../query-process');

const sanitizeViewTablesFactory = (_, database, replaceDatabaseNameFn, escapeQuotesFn) =>
    queryProcess.sanitizeViewTables.bind(null, _, database, replaceDatabaseNameFn, escapeQuotesFn);

const seperateColumnsFactory = (filterIndexesFn) => 
    queryProcess.seperateColumns.bind(null, filterIndexesFn);

const escapeRowsFactory = (escapeFn) => 
    queryProcess.escapeRows.bind(null, escapeFn);


module.exports = {
    sanitizeViewTablesFactory, seperateColumnsFactory, escapeRowsFactory
}