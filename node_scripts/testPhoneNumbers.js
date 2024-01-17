/* eslint-disable */

const mongoose = require('mongoose');
require('../database');
const {
    VehicleModel,
    GPSDataModel
} = require('../models/gpslocation');
const { GPSController } = require('../controllers/GPSController');
const { UserModel } = require('../models/user');

async function run() {
    let smsReceivers
    let usersUniqueNumbers
    VehicleModel.aggregate(
        [
            {
                '$match': {
                    'speedAlarm.sendSMS': true,
                    'speedAlarm.rcvSMSNumbers': {
                        '$ne': null
                    }
                }
            }, {
            '$set': {
                'speedSmsNumbers': '$speedAlarm.rcvSMSNumbers'
            }
        }, {
            '$project': {
                '_id': 0,
                'speedSmsNumbers': 1
            }
        }
        ])
        .exec(function (error, result) {
            let smsNumbers = [];
            result.map(smsNum => {
                smsNumbers.push(smsNum.speedSmsNumbers);
            });
            smsReceivers = [...new Set(smsNumbers)];
        });

    UserModel.aggregate([{
        '$project': {
            '_id': 0,
            'mobileNumber': 1
        }
    }])
        .exec(function (error, phoneNumbers) {
            let usersNumbers = [];
            phoneNumbers.map(numbers => {
                usersNumbers.push(numbers.mobileNumber);
            });
            usersUniqueNumbers = [...new Set(usersNumbers)];

            let notUser = smsReceivers.filter(x => !usersUniqueNumbers.includes(x));
            console.log(`smsPhoneNumbers: ${smsReceivers.length} --- usersPhoneNumbers: ${usersUniqueNumbers.length} --- difference: ${notUser.length}`);
        });
}

run()
    .then(() => {
        console.log('The end');
    });
