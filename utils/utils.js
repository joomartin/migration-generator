const util = require('util');
const chalk = require('chalk');
const _ = require('lodash');
const { addIndex, map } = require('ramda');

const mapIndex = addIndex(map);

const sideEffect = fn => v => {
    fn(v);
    return v;
}

const getDate = () => {
    let date = new Date;
    let month = date.getMonth() + 1;
    let zeroFilledMonth = ("0" + month).slice(-2);

    return `${date.getFullYear()}${zeroFilledMonth}${date.getDate()}`;
}

const getSerial = (number, width = 6) => _.padStart(number, width, 0);

const setKey = (object, key, value, mapFn, evaulateFn) => {
    if (evaulateFn !== undefined) {
        if (evaulateFn()) {
            object[key] = value;
        }
    } else if (value !== null && value !== undefined) {
        let realValue = mapFn === undefined ? value : mapFn(value);        
        object[key] = realValue;
    }
}


const logHeader = (config, util, console, chalk) => {
    console.log(chalk.green('********************************************************'));
    console.log(chalk.green('*                                                      *'));
    console.log(chalk.green('*                 Migration Generator                  *'));
    console.log(chalk.green('*               GreenTech Innovacio Zrt.               *'));
    console.log(chalk.green('*                                                      *'));
    console.log(chalk.green('********************************************************'));

    util.log(chalk.yellow(`Generating initial migrations for database ${chalk.bold(config.database)}...`));
    util.log(chalk.yellow(`View tables, procedures, triggers, static contents, dependencies will be created`));
    util.log(chalk.bgRed.bold.yellow(`***Don't forget to rewrite DEFINER in views, procedures, triggers***`));
    console.log('--------');
}

module.exports = {
    sideEffect, getDate, logHeader,
    getSerial, setKey, mapIndex
}