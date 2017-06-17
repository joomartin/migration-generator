const queryProcess = require('./query-process');

const sanitizeViewTablesFactory = (_, database, replaceDatabaseNameFn, escapeQuotesFn) =>
    queryProcess.sanitizeViewTables.bind(null, _, database, replaceDatabaseNameFn, escapeQuotesFn);

const seperateColumnsFactory = (filterIndexesFn) => 
    queryProcess.seperateColumns.bind(null, filterIndexesFn);

const escapeRowsFactory = (escapeFn) => 
    queryProcess.escapeRows.bind(null, escapeFn);

const normalizeProcedureDefinitionFactory = (_, escapeFn) =>
    queryProcess.normalizeProcedureDefinition.bind(null, _, escapeFn);

const mapTriggersFactory = (_, escapeFn, database) => 
    queryProcess.mapTriggers.bind(null, _, escapeFn, database);

const parseDependenciesFactory = (_, substringFromFn) => 
    queryProcess.parseDependencies.bind(null, _, substringFromFn);

module.exports = {
    sanitizeViewTablesFactory, seperateColumnsFactory, escapeRowsFactory,
    normalizeProcedureDefinitionFactory, mapTriggersFactory,
    parseDependenciesFactory
}