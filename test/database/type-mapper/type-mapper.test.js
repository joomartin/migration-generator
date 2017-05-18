const TypeMapper = require('../../../database/type-mapper/type-mapper');
const expect = require('chai').expect;

describe('TypeMapper', () => {
    describe('#map()', () => {
        it('should throws an exception', () => {
            let typeMapper = new TypeMapper;
            expect(() => typeMapper.map()).to.throw('Abstract method. Must be implemented')
        });
    });
});
