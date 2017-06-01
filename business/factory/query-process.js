const queryProcess = require('../query-process');

const sanitizeViewTablesFactory = (_, database, replaceDatabaseNameFn, escapeQuotesFn) =>
    queryProcess.sanitizeViewTables.bind(null, _, database, replaceDatabaseNameFn, escapeQuotesFn);

const seperateColumnsFactory = (filterIndexesFn) => 
    queryProcess.seperateColumns.bind(null, filterIndexesFn);

module.exports = {
    sanitizeViewTablesFactory, seperateColumnsFactory
}