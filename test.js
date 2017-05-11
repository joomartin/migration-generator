const TYPES = [
    {native: 'varchar', mapped: 'string'},
    {native: 'int', mapped: 'integer'},
    {native: 'bigint', mapped: 'biginteger'},
    {native: 'tinyint', mapped: 'integer'},
    {native: 'decimal', mapped: 'decimal'},
];

function mapType(type) {
    return TYPES
        .filter(t => t.native.includes(type))
        .map(t => t.mapped)
        .shift() || type.toLowerCase();
}

function getType(type) {
    let parts = type.split('(');
    let length = null;
    let decimals = null;
    let options = {};

    // DECIMAL (10,2)
    if (parts[1] && parts[1].includes(',')) {
        let lengthParts = parts[1].split(',');
        length = lengthParts[0];
        decimals = lengthParts[1].slice(0, lengthParts[1].length - 1).trim();
    } else if (parts[1] && parts[1].includes(' ')) {    // INT (10) UNSIGNED
        let optionsParts = parts[1].split(' ');
        options.unsigned = (optionsParts[1] === 'unsigned');

        length = optionsParts[0].slice(0, optionsParts[0].length - 1);
    } else if(parts[1]) {   // INT (10)
        length = parts[1].slice(0, parts[1].length - 1);
    }

    if (length) {
        options.length = length;        
    }

    if (decimals) {
        options.decimals = decimals;
    }

    return {
        type: mapType(parts[0]),
        options
    };
}

/*console.log(getType('varchar(100)'));
console.log(getType('text'));
console.log(getType('longtext'));
console.log(getType('int(11)'));
console.log(getType('bigint(20)'));
console.log(getType('tinyint(1)'));*/
console.log(getType('decimal(10, 2) UNSIGNED'));