const mongoose = require('mongoose');
require('../database');
const { GPSDataModel } = require('../models/gpslocation');

GPSDataModel.aggregate([
    {
        $set: {
            date: {
                $dateFromString: {
                    dateString: { $substr: ['$date', 0, 34] },
                },
            },
        },
    },
    {
        $out: `${GPSDataModel.modelName}s`,
    },
]).exec((error, { nModified }) => {
    console.log(`${nModified} location items updated.`);
    mongoose.disconnect();
});
