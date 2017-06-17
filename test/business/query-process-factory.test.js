const expect = require('chai').expect;
const _ = require('lodash');

const strUtils = require('../../utils/str');
const queryProcessFactory = require('../../business/query-process-factory');

describe('QueryProcessFactory', () => {
    describe('#sanitizeViewTablesFactory', () => {
        it('should return sanitizeViewTables function', () => {
            const sanitizeViewTablesFn = queryProcessFactory.sanitizeViewTablesFactory(_, {}, () => {}, () => {});

            expect(sanitizeViewTablesFn).to.be.ok;
            expect(sanitizeViewTablesFn).to.be.a.function;
        });
    });

    describe('#escapeRowsFactory', () => {
        it('should return escapeRows function', () => {
            const escapeRowsFn = queryProcessFactory.escapeRowsFactory(() => {});

            expect(escapeRowsFn).to.be.ok;
            expect(escapeRowsFn).to.be.a.function;
        });
    });

    describe('#normalizeProcedureDefinitionFactory', () => {
        it('should return normalizeProcedureDefinition function', () => {
            const normalizeProcedureDefinitionFn = queryProcessFactory.normalizeProcedureDefinitionFactory(_, () => {});

            expect(normalizeProcedureDefinitionFn).to.be.ok;
            expect(normalizeProcedureDefinitionFn).to.be.a.function;
        });
    });

    describe('#mapTriggersFactory', () => {
        it('should return mapTriggers function', () => {
            const mapTriggersFn = queryProcessFactory.mapTriggersFactory(_, () => {});

            expect(mapTriggersFn).to.be.ok;
            expect(mapTriggersFn).to.be.a.function;
        });
    });

    describe('#parseDependenciesFactory', () => {
        it('should return parseDependencies function', () => {
            const parseDependenciesFn = queryProcessFactory.parseDependenciesFactory(_, () => {});

            expect(parseDependenciesFn).to.be.ok;
            expect(parseDependenciesFn).to.be.a.function;
        });
    });
});