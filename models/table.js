const mongoose = require("mongoose");

const Table = mongoose.model('Table', {
    name: {
        type: String,
        required: true
    },
    database: {
        type: String,
        required: true
    }
});

module.exports = {
    Table
};