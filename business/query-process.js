/**
 * @param {Array} tables - List of tables. Raw mysql results
 * @param {Object} config - App config
 * @return {Array} - Filtered tables
 */
const filterExcluededTables = (tables, config) => tables.filter(t => !config.excludedTables.includes(t[`Tables_in_${config.database}`]));

/**
 * @param {Array} viewTables - Raw view tables queried from database
 * @param {Function} replaceDatabaseNameFn - A callback that replaces source database name from view definition
 * @param {Function} escapeQuotesFn - A callback that escape quotes
 * @param {Object} _ - lodash
 * @return {Array} - Sanitized view tables
 */
const sanitizeViewTables = (viewTables, replaceDatabaseNameFn, escapeQuotesFn, database, _) =>
    viewTables.map(vt => {
        let viewTable = _.clone(vt);
        viewTable.VIEW_DEFINITION = replaceDatabaseNameFn(
            database, escapeQuotesFn(vt.VIEW_DEFINITION));

        return viewTable;
    });

module.exports = {
    filterExcluededTables, sanitizeViewTables
}