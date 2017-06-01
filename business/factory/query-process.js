const queryProcess = require('../query-process');

const sanitizeViewTablesFactory = (_, database, replaceDatabaseNameFn, escapeQuotesFn) =>
    queryProcess.sanitizeViewTables.bind(null, _, database, replaceDatabaseNameFn, escapeQuotesFn);

module.exports = {
    sanitizeViewTablesFactory
}