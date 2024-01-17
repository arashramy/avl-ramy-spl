/*eslint-disable */
const mongoose = require('mongoose');
require('../database');
const { VehicleModel } = require('../models/gpslocation');
const { log } = require('debug');

function updateVehiclesData() {
    function toPersianCharacter(string) {
        const obj = {
            'ك': 'ک',
            'دِ': 'د',
            'بِ': 'ب',
            'زِ': 'ز',
            'ذِ': 'ذ',
            'شِ': 'ش',
            'سِ': 'س',
            'ى': 'ی',
            'ي': 'ی',
        };

        Object.keys(obj)
            .forEach(function (key) {
                string = string.replace(new RegExp(key, 'g'), obj[key]);
            });
        return string;
    }
    return VehicleModel.find()
        .select('deviceIMEI driverName vehicleName usage')
        .exec(async (error, vehicles) => {
            if (error || !vehicles) {
                console.log(error);
                console.log('An error occurred in retrieving vehicles.');
                return;
            }
            for (let index = 0; index < vehicles.length; index++) {
                let vehicle = vehicles[index];
                await VehicleModel.updateOne({ _id: vehicle.id }, {
                    $set:
                        {
                            driverName: toPersianCharacter(vehicle.driverName),
                            vehicleName: toPersianCharacter(vehicle.vehicleName),
                            usage: toPersianCharacter(vehicle.usage),
                        }
                });
            }
        });
}

updateVehiclesData()
    .then(() => {
        console.log('update successfully!');
        mongoose.disconnect;
    });
