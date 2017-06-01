/**
 * @param {Array} tables - List of tables. Raw mysql results
 * @param {Object} config - App config
 * @return {Array} - Filtered tables
 */
const filterExcluededTables = (tables, config) => tables.filter(t => !config.excludedTables.includes(t[`Tables_in_${config.database}`]));

module.exports = {
    filterExcluededTables
}