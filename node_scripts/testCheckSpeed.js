/* eslint-disable */

const mongoose = require('mongoose');
require('../database');
const {
    VehicleModel,
    GPSDataModel
} = require('../models/gpslocation');
const { GPSController } = require('../controllers/GPSController');

async function run() {
    let vehicle = await VehicleModel.findOne({ alarms: { $ne: [] } })
        .select('deviceIMEI');
    await GPSController.checkSpeed({
        speed: 150,
        IMEI: vehicle.deviceIMEI,
        url: 'http://maps.google.com/maps?q=35.7443783,59.774165'
    });

    vehicle = await VehicleModel.findOne({
        alarms: [],
        lastLocation: { $ne: null }
    })
        .select('deviceIMEI');
    await GPSController.checkSpeed({
        speed: 150,
        IMEI: vehicle.deviceIMEI,
        url: 'http://maps.google.com/maps?q=35.7443783,59.774165'
    });
}

run()
    .then(() => {
        console.log('The end');
    });

