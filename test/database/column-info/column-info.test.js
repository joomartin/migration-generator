const { ColumnInfo, normalizeLength, parseIntFromArray, isTypeOf, isUnsigned, isPrimaryKey, getOptions, getType } = require('../../../database/column-info/column-info');
const expect = require('chai').expect;
const { head, nth } = require('ramda');

describe('ColumnInfo', () => {
    describe('#isPrimaryKey()', () => {
        it('should return true if a field is primary key', () => {
            let info = new ColumnInfo({
                Key: 'PRI'
            });

            expect(info.isPrimaryKey()).to.be.true;
        });

        it('should return false if a field is not primary key', () => {
            let info = new ColumnInfo({
                Key: 'MUL'
            });

            expect(info.isPrimaryKey()).to.be.false;
        });
    });

    describe('#getOptions()', () => {
        it('should return column options as an object', () => {
            let info = new ColumnInfo({
                Null: 'NO',
                Default: 'Value',
                Key: 'UNI'
            });

            let options = info.getOptions();

            expect(options.null).to.be.false;
            expect(options.default).to.be.equal('Value');
        });

        it('should return column options as an object excluding non existing options', () => {
            let info = new ColumnInfo({
                Default: 'Value'
            });

            let options = info.getOptions();

            expect(options.null).to.be.true;
            expect(options.default).to.be.equal('Value');
        });

        it('should return default object when column does not have options', () => {
            let info = new ColumnInfo({
                Type: 'INT (10)'
            });

            let options = info.getOptions();

            expect(options).to.be.deep.equal({null: true});
        });
    });

    describe('#getOptions1()', () => {
        it('should assoc the null property as false if value "NO" given', () => {
            const field = {
                Null: 'NO'
            }

            const options = getOptions(field);
            expect(options.null).to.be.false;
        });

        it('should assoc the null property as true, if nothing given', () => {
            const field = {}

            const options = getOptions(field);
            expect(options.null).to.be.true;
        });

        it('should assoc the default property as the given data', () => {
            const field = {
                Default: 'Value',
            };

            const options = getOptions(field);
            expect(options.default).to.be.equal('Value');
        });

        it('should assoc the default property as undefined if no data given', () => {
            const field = {}; 

            const options = getOptions(field);
            expect(options.default).to.be.undefined;
        });

        it('should assoc the auto_increment property as true if given data', () => {
            const field = {
                Extra: 'auto_increment'
            };

            const options = getOptions(field);
            expect(options.auto_increment).to.be.true;
        });

        it('should assoc the auto_increment property as undefined if no given data', () => {
            const field = {};

            const options = getOptions(field);
            expect(options.auto_increment).to.be.undefined;
        });
    })
    
    describe('#getType()', () => {
        it('should return int type with length', () => {
            // INT (10)
            let type = (new ColumnInfo({
                Type: 'INT (10)'
            })).getType();

            expect(type.name).to.be.equal('INT');
            expect(type.options.length).to.be.equal(10);
            expect(type.options.unsigned).to.be.false;
        });

        it('should return varchar type with length', () => {
            // VARCHAR (100)
            let type = (new ColumnInfo({
                Type: 'VARCHAR (100)'
            })).getType();

            expect(type.name).to.be.equal('VARCHAR');
            expect(type.options.length).to.be.equal(100);
            expect(type.options.unsigned).to.be.undefined;
            
        });

        it('should return text type', () => {
            // TEXT
            let type = (new ColumnInfo({
                Type: 'TEXT'
            })).getType();

            expect(type.name).to.be.equal('TEXT');
        });

        it('should return long text type', () => {
            // LONGTEXT
            let type = (new ColumnInfo({
                Type: 'LONGTEXT'
            })).getType();

            expect(type.name).to.be.equal('LONGTEXT');
        });

        it('should return int type with length and signed', () => {
            // INT (10) UNSIGNED
            let type = (new ColumnInfo({
                Type: 'INT (11) UNSIGNED'
            })).getType();

            expect(type.name).to.be.equal('INT');
            expect(type.options.length).to.be.equal(11);
            expect(type.options.unsigned).to.be.true;
        });

        it('should return decimal type with precision and scale', () => {
            // DECIMAL (10, 2)
            let type = (new ColumnInfo({
                Type: 'DECIMAL (10, 2)'
            })).getType();

            expect(type.name).to.be.equal('DECIMAL');
            expect(type.options.precision).to.be.equal(10);
            expect(type.options.scale).to.be.equal(2);
            expect(type.options.unsigned).to.be.false;
        });

        it('should return decimal type with precision, scale and unsigned', () => {
            // DECIMAL (10, 2) UNSIGNED
            let type = (new ColumnInfo({
                Type: 'DECIMAL (12, 4) UNSIGNED'
            })).getType();

            expect(type.name).to.be.equal('DECIMAL');
            expect(type.options.precision).to.be.equal(12);
            expect(type.options.scale).to.be.equal(4);
            expect(type.options.unsigned).to.be.true;
        });

        it('should return tinyint with length', () => {
            // TINYINT (1)
            let type = (new ColumnInfo({
                Type: 'TINYINT (1)'
            })).getType();

            expect(type.name).to.be.equal('TINYINT');
            expect(type.options.length).to.be.equal(1);
        });
    });

    describe('#getType()', () => {
        it('should return int type with length', () => {
            // INT (10)
            const type = getType({
                Type: 'INT (10)'
            });

            expect(type.name).to.be.equal('INT');
            expect(type.options.length).to.be.equal(10);
            expect(type.options.unsigned).to.be.false;
        });

        it('should return varchar type with length', () => {
            // VARCHAR (100)
            const type = getType({
                Type: 'VARCHAR (100)'
            });

            expect(type.name).to.be.equal('VARCHAR');
            expect(type.options.length).to.be.equal(100);
            expect(type.options.unsigned).to.be.undefined;
        });

        it('should return text type', () => {
            // TEXT
            const type = getType({
                Type: 'TEXT'
            });

            expect(type.name).to.be.equal('TEXT');
        });

        it('should return long text type', () => {
            // LONGTEXT
            const type = getType({
                Type: 'LONGTEXT'
            });

            expect(type.name).to.be.equal('LONGTEXT');
        });

        it('should return int type with length and signed', () => {
            // INT (10) UNSIGNED
            const type = getType({
                Type: 'INT (11) UNSIGNED'
            });

            expect(type.name).to.be.equal('INT');
            expect(type.options.length).to.be.equal(11);
            expect(type.options.unsigned).to.be.true;
        });

        it('should return decimal type with precision and scale', () => {
            // DECIMAL (10, 2)
            const type = getType({
                Type: 'DECIMAL (10, 2)'
            });

            expect(type.name).to.be.equal('DECIMAL');
            expect(type.options.precision).to.be.equal(10);
            expect(type.options.scale).to.be.equal(2);
            expect(type.options.unsigned).to.be.false;
        });

        it('should return decimal type with precision, scale and unsigned', () => {
            // DECIMAL (10, 2) UNSIGNED
            const type = getType({
                Type: 'DECIMAL (12, 4) UNSIGNED'
            });

            expect(type.name).to.be.equal('DECIMAL');
            expect(type.options.precision).to.be.equal(12);
            expect(type.options.scale).to.be.equal(4);
            expect(type.options.unsigned).to.be.true;
        });

        it('should return tinyint with length', () => {
            // TINYINT (1)
            const type = getType({
                Type: 'TINYINT (1)'
            });

            expect(type.name).to.be.equal('TINYINT');
            expect(type.options.length).to.be.equal(1);
        });
    });

    describe('#getTypeOptions', () => {
        it('should get length if it is a string', () => {
            const typeOptions = (new ColumnInfo({
                Type: 'LONGTEXT'
            })).getTypeOptions('LONGTEXT', null, null, 'LONG', false);

            expect(typeOptions.length).to.be.eq('LONG');
        });
    }); 

    describe('#mapOptions', () => {
        it('should return the given object', () => {
            let options = {
                auto_increment: true
            };
            let mapped = (new ColumnInfo).mapOptions(options);

            expect(mapped).to.be.equal(options);
        });
    });

    describe('#mapTypeOptions', () => {
        it('should return the given object', () => {
            let options = {
                unsigned: true
            };
            let mapped = (new ColumnInfo).mapTypeOptions(options);

            expect(mapped).to.be.equal(options);
        });
    });

    describe('#mapType', () => {
        it('should return the given type', () => {            
            let mapped = (new ColumnInfo).mapType('int');

            expect(mapped).to.be.equal('int');
        });
    });

    describe('#normalizeLength()', () => {
        it('should parse integer, if length is number', () => {
            const result = normalizeLength('12');
            expect(result).to.be.eq(12);
        });

        it('should return length if it is not a number', () => {
            const result = normalizeLength('LONG');
            expect(result).to.be.eq('LONG');
        })
    });

    describe('#parseIntFromArray()', () => {
        it('should parse any item of an array as integer', () => {
            const arr = ['1', 2, '3.11'];

            expect(parseIntFromArray(head, arr)).to.be.eq(1);
            expect(parseIntFromArray(nth(1), arr)).to.be.eq(2);
            expect(parseIntFromArray(nth(2), arr)).to.be.eq(3);
        });
    });

    describe('#isTypeOf()', () => {
        it('should return true if a given string is type of an expected type', () => {
            expect(isTypeOf('decimal', 'decimal (10, 2)')).to.be.true; 
            expect(isTypeOf('INT', 'INT (11)')).to.be.true; 
            expect(isTypeOf('INT', 'TINYINT (1)')).to.be.true; 
        });

        it('should return false if a given string is NOT type of an expected type', () => {
            expect(isTypeOf('decimal', 'float (10, 2)')).to.be.false; 
            expect(isTypeOf('INT', 'VARCHAR (20)')).to.be.false; 
        });

        it('should ignore case sensitive', () => {
            expect(isTypeOf('DECIMAL', 'decimal (10, 2)')).to.be.true; 
            expect(isTypeOf('int', 'INT (11)')).to.be.true; 
            expect(isTypeOf('INT', 'tinyint (1)')).to.be.true; 

            expect(isTypeOf('DECIMAL', 'float (10, 2)')).to.be.false; 
            
        });
    });

    describe('#isUnsigned()', () => {
        it('should return true, if a given type is unsigned', () => {
            expect(isUnsigned('INT (11) UNSIGNED')).to.be.true;
            expect(isUnsigned('DECIMAL (10, 2) NOT NULL UNSIGNED')).to.be.true;
        });

        it('should return false, if a given type is NOT unsigned', () => {
            expect(isUnsigned('INT (11)')).to.be.false;
            expect(isUnsigned('DECIMAL (10, 2) NOT NULL')).to.be.false;
        });

        it('should ignore case sensitive', () => {
            expect(isUnsigned('INT (11) unsigned')).to.be.true;
            expect(isUnsigned('INT (11) UNSIGNED')).to.be.true;
            expect(isUnsigned('DECIMAL (10, 2) NOT NULL unsigned')).to.be.true;
            expect(isUnsigned('DECIMAL (10, 2) NOT NULL UNSIGNED')).to.be.true;

            expect(isUnsigned('INT (11)')).to.be.false;
            expect(isUnsigned('int (11)')).to.be.false;            
        });
    });

    describe('#isPrimaryKey()', () => {
        it('should return true if the given column has key PRI', () => {
            expect(isPrimaryKey({ Key: 'PRI' })).to.be.true;
            expect(isPrimaryKey({ Field: 'id', Key: 'PRI' })).to.be.true;
        });

        it('should return false if the given column NOT have key PRI', () => {
            expect(isPrimaryKey({ Field: 'user_id', Key: 'MUL' })).to.be.false;
            expect(isPrimaryKey({ Field: 'id' })).to.be.false;
        });

        it('should ignore case sensitive', () => {
            expect(isPrimaryKey({ Key: 'pri' })).to.be.true;
            expect(isPrimaryKey({ Field: 'id', Key: 'pri' })).to.be.true;
        });
    });
});