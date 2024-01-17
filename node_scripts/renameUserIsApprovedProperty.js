const mongoose = require('mongoose');
require('../database');
const { UserModel } = require('../models/user');

UserModel.updateMany(
    {},
    { $rename: { isaproved: 'isapproved' } },
    { strict: false }
).exec((error, { nModified }) => {
    if (error) {
        console.log('An error occurred in updating users.');
    } else {
        console.log(`${nModified} users have been updated.`);
    }
    mongoose.disconnect();
});
