const mongoose = require('mongoose');
require('../database');
const { GPSDataModel } = require('../models/gpslocation');

GPSDataModel.updateMany(
    {},
    [
        {
            $set: {
                speed: { $toInt: '$speed' },
                lat: { $toDouble: '$lat' },
                lng: { $toDouble: '$lng' },
            },
        },
    ],
    { strict: false }
).exec((error, { nModified }) => {
    console.log(`${nModified} location items updated.`);
    mongoose.disconnect();
});
