const mongoose = require('mongoose');
require('../database');
const { VehicleModel } = require('../models/gpslocation');

VehicleModel.updateMany({}, { $unset: { groups: '' } }, { strict: false }).exec(
    (error, { nModified }) => {
        if (error) {
            console.log('An error occurred in retrieving vehicles.');
        } else {
            console.log(
                `${nModified} groups fields were deleted from containing vehicles.`
            );
        }
        mongoose.disconnect();
    }
);
