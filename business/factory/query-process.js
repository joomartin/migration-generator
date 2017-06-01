const queryProcess = require('../query-process');

const sanitizeViewTablesFactory = (_, database, replaceDatabaseNameFn, escapeQuotesFn) =>
    queryProcess.sanitizeViewTables.bind(null, _, database, replaceDatabaseNameFn, escapeQuotesFn);

const seperateColumnsFactory = (filterIndexesFn) => 
    queryProcess.seperateColumns.bind(null, filterIndexesFn);

const escapeRowsFactory = (escapeFn) => 
    queryProcess.escapeRows.bind(null, escapeFn);

const mapDependenciesFactory = (_) => 
    queryProcess.mapDependencies.bind(null, _);

const normalizeProcedureDefinitionFactory = (_, escapeFn) =>
    queryProcess.normalizeProcedureDefinition.bind(null, _, escapeFn);

module.exports = {
    sanitizeViewTablesFactory, seperateColumnsFactory, escapeRowsFactory,
    mapDependenciesFactory, normalizeProcedureDefinitionFactory
}