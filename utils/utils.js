const sideEffect = fn => v => {
    fn(v);
    return v;
}

const getDate = () => {
    let date = new Date;
    return `${date.getFullYear()}${("0" + date.getMonth()).slice(-2)}${date.getDate()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}${date.getMilliseconds()}`;      
}

module.exports = {
    sideEffect, getDate
}