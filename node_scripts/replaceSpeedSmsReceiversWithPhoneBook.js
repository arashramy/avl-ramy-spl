/* eslint-disable */

const mongoose = require('mongoose');
require('../database');
const {
    VehicleModel,
} = require('../models/gpslocation');
const PhoneBookModel = require('../models/user/phoneBookModel');

async function run() {
    VehicleModel.find(
        {
            'speedAlarm.sendSMS': true,
            'speedAlarm.rcvSMSNumbers': {
                '$ne': null
            }
        })
        .select({
                '_id': 0,
                'deviceIMEI': 1,
                'speedAlarm.rcvSMSNumbers': 1,
                'speedAlarm.smsReceivers': 1,
            })
        .exec((error, vehicles) => {
            vehicles.map(async vehicle => {
                const vehiclePhoneBook = await PhoneBookModel.find({ phoneNumber: {$in: vehicle.speedAlarm.rcvSMSNumbers.split(';')} }).exec();
                await VehicleModel.updateOne({deviceIMEI: vehicle.deviceIMEI},
                    { 'speedAlarm.smsReceivers': vehiclePhoneBook.map(phoneBook => phoneBook._id) })
                    .exec(function (err, result) {
                        console.log(result);
                        if (err) {
                            console.log(err);
                        } else {
                            return 'successful'
                        }
                    });
            })
        });
}

run()
    .then(async () => {
        console.log('done!');
    });
