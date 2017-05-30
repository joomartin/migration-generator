const util = require('util');
const chalk = require('chalk');

const sideEffect = fn => v => {
    fn(v);
    return v;
}

const getDate = () => {
    let date = new Date;
    return `${date.getFullYear()}${("0" + date.getMonth()).slice(-2)}${date.getDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}${date.getMilliseconds()}`;
}

const logHeader = (config) => {
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
    sideEffect, getDate, logHeader
}