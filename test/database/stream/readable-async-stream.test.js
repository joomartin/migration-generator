const expect = require('chai').expect;

const ReadableAsync = require('../../../database/stream/readable-async-stream');

describe('ReadableAsync', () => {
    describe('#_readBody()', () => {
        it('should throw an exception', () => {
            const readable = new ReadableAsync;
            
            expect(() => readable._readBody())
                .to.throw(Error)
        });
    });
});