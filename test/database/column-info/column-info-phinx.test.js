const ColumnInfoPhinx = require('../../../database/column-info/column-info-phinx')
const expect = require('chai').expect;

describe('ColumnInfoPhinx', () => {
    describe('#isPrimaryKey()', () => {
        it('should return true if a field is primary key', () => {
            let info = new ColumnInfoPhinx({
                Key: 'PRI'
            });

            expect(info.isPrimaryKey()).to.be.true;
        });

        it('should return false if a field is not primary key', () => {
            let info = new ColumnInfoPhinx({
                Key: 'MUL'
            });

            expect(info.isPrimaryKey()).to.be.false;
        });
    });

    describe('#getOptions()', () => {
        it('should return column options as an object', () => {
            let info = new ColumnInfoPhinx({
                Null: 'NO',
                Default: 'Value',
                Key: 'UNI'
            });

            let options = info.getOptions();

            expect(options.null).to.be.false;
            expect(options.default).to.be.equal('Value');
        });

        it('should return column options as an object excluding non existing options', () => {
            let info = new ColumnInfoPhinx({
                Default: 'Value'
            });

            let options = info.getOptions();

            expect(options.null).to.be.true;
            expect(options.default).to.be.equal('Value');
        });

        it('should return default object when column does not have options', () => {
            let info = new ColumnInfoPhinx({
                Type: 'INT (10)'
            });

            let options = info.getOptions();

            expect(options).to.be.deep.equal({null: true});
        });
    });
    
    describe('#getType()', () => {
        it('should return int type with length', () => {
            // INT (10)
            let type = (new ColumnInfoPhinx({
                Type: 'INT (10)'
            })).getType();

            expect(type.name).to.be.equal('INT');
            expect(type.options.length).to.be.equal(10);
            expect(type.options.signed).to.be.true;
        });

        it('should return varchar type with length', () => {
            // VARCHAR (100)
            let type = (new ColumnInfoPhinx({
                Type: 'VARCHAR (100)'
            })).getType();

            expect(type.name).to.be.equal('VARCHAR');
            expect(type.options.length).to.be.equal(100);
            expect(type.options.signed).to.be.undefined;
            
        });

        it('should return text type', () => {
            // TEXT
            let type = (new ColumnInfoPhinx({
                Type: 'TEXT'
            })).getType();

            expect(type.name).to.be.equal('TEXT');
            expect(type.options.signed).to.be.undefined;            
        });

        it('should return long text type', () => {
            // LONGTEXT
            let type = (new ColumnInfoPhinx({
                Type: 'LONGTEXT'
            })).getType();

            expect(type.name).to.be.equal('LONGTEXT');
            expect(type.options.length).to.be.equal('MysqlAdapter::TEXT_LONG');
        });

        it('should return int type with length and signed', () => {
            // INT (10) UNSIGNED
            let type = (new ColumnInfoPhinx({
                Type: 'INT (11) UNSIGNED'
            })).getType();

            expect(type.name).to.be.equal('INT');
            expect(type.options.length).to.be.equal(11);
            expect(type.options.signed).to.be.false;
        });

        it('should return decimal type with precision and scale', () => {
            // DECIMAL (10, 2)
            let type = (new ColumnInfoPhinx({
                Type: 'DECIMAL (10, 2)'
            })).getType();

            expect(type.name).to.be.equal('DECIMAL');
            expect(type.options.precision).to.be.equal(10);
            expect(type.options.scale).to.be.equal(2);
            expect(type.options.signed).to.be.true;
        });

        it('should return decimal type with precision, scale and unsigned', () => {
            // DECIMAL (10, 2) UNSIGNED
            let type = (new ColumnInfoPhinx({
                Type: 'DECIMAL (12, 4) UNSIGNED'
            })).getType();

            expect(type.name).to.be.equal('DECIMAL');
            expect(type.options.precision).to.be.equal(12);
            expect(type.options.scale).to.be.equal(4);
            expect(type.options.signed).to.be.false;
        });

        it('should return tinyint with length', () => {
            // TINYINT (1)
            let type = (new ColumnInfoPhinx({
                Type: 'TINYINT (1)'
            })).getType();

            expect(type.name).to.be.equal('TINYINT');
            expect(type.options.length).to.be.equal(1);
            expect(type.options.signed).to.be.true;    
        });
    });

    describe('#mapOptions', () => {
        it('should map auto increment to identity', () => {
            let options = {
                auto_increment: true
            };
            let mapped = (new ColumnInfoPhinx()).mapOptions(options);

            expect(mapped.identity).to.be.true;
            expect(mapped.auto_increment).to.be.undefined;
        });
    });

    describe('#mapTypeOptions', () => {
        it('should map unsigned to signed', () => {
            let options = {
                unsigned: true
            };
            let type = 'int (11) unsigned';
            let mapped = (new ColumnInfoPhinx()).mapTypeOptions(options, type);

            expect(mapped.signed).to.be.false;
            expect(mapped.unsigned).to.be.undefined;

            options = {
                unsigned: false
            };
            mapped = (new ColumnInfoPhinx()).mapTypeOptions(options, type);

            expect(mapped.signed).to.be.true;
            expect(mapped.unsigned).to.be.undefined;
        });

        it('should map longtext to longtext with specific length options', () => {
            let type = 'longtext';
            let mapped = (new ColumnInfoPhinx()).mapTypeOptions({}, type);

            expect(mapped.length).to.be.equal('MysqlAdapter::TEXT_LONG');
        });
    });
});