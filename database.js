const mongoose = require('mongoose');
const { logger } = require('./utility/customlog');

mongoose.Promise = global.Promise;

mongoose.connect('mongodb://192.168.20.147:27017/AVL');


const db = mongoose.connection;
db.on('error', () => logger.error('Connection error.'));
db.once('open', () =>
    logger.debug('Connection is established to AVL Database.')
);

module.exports = { db };
