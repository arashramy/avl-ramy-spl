/* eslint-disable */

const mongoose = require('mongoose');
require('../database');
const {
    VehicleModel,
    GPSDataModel
} = require('../models/gpslocation');

async function run() {
    const vehicles = await VehicleModel.find({})
        .select('deviceIMEI');
    let counter = 0;
    for (let j = 0; j < vehicles.length; j++) {
        counter++;
        let IMEI = vehicles[j].deviceIMEI;
        let gpsdatas = await GPSDataModel.find({ IMEI: IMEI })
            .select('_id date speed');
        gpsdatas.sort((a, b) => +(a.date - b.date));
        let lastValid = gpsdatas[gpsdatas.length - 1] || {};
        lastValid.valid = true;
        for (let i = gpsdatas.length - 2; i >= 0; i--) {
            const gpsData = gpsdatas[i];
            if (lastValid !== {}) {
                if ((Math.abs(gpsData.date - lastValid.date) < (10 * 60 * 1000)) && (Math.abs(lastValid.speed - gpsData.speed) < 5)) {
                    gpsData.valid = false;
                } else {
                    gpsData.valid = true;
                    lastValid = gpsData;
                }
            }
        }
        const removeIds = gpsdatas.filter(gpsData => !gpsData.valid)
            .map(gpsData => gpsData._id);
        let deleted = await GPSDataModel.deleteMany({ _id: removeIds });
        console.log(`${IMEI}: ${deleted.deletedCount} / ${gpsdatas.length}`);
    }
}

run()
    .then(() => {
        console.log('The end');
    });

