const mongoose = require('mongoose');
require('../database');
const { VehicleModel } = require('../models/gpslocation');

VehicleModel.updateMany(
    {},
    { $unset: { driverNationalityCode: '', driverID: '' } },
    { strict: false }
).exec((error, { nModified }) => {
    if (error) {
        console.log('An error occurred in retrieving vehicles.');
    } else {
        console.log(
            `${nModified} driverNationalityCode fields were deleted from containing vehicles.`
        );
    }
    mongoose.disconnect();
});
