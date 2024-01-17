/*eslint-disable */

const mongoose = require('mongoose');
require('../database');
const {
    VehicleModel,
} = require('../models/gpslocation');
const VehicleTypeModel = require('../models/gpslocation/VehicleTypeModel');
const data = require('../updated_data/ImportUpdateAVLData14020528.json');

function updateVehiclesData() {
    return VehicleModel.find()
        .select('deviceIMEI model vehicleName usage fuel')
        .populate({ path: 'model',
            select: {
                name: 1,
                _id: 0
            },
            model: VehicleTypeModel
        })
        .exec(async (error, vehicles) => {
            if (error || !vehicles) {
                console.log(error);
                console.log('An error occurred in retrieving vehicles.');
                return;
            }
            let hasData = 0;
            let noData = 0;
            for (let index = 0; index < vehicles.length; index++) {
                const vehicle = vehicles[index];
                const relatedData = data.find(row => row.IMEI === vehicle.deviceIMEI);
                if (relatedData) {
                    hasData += 1;
                    if (relatedData.model) {
                        const typeExist = await VehicleTypeModel.exists({ name: {$eq: (relatedData.model).trim()} });
                        if (!typeExist) {
                            console.log(`----------model ${relatedData.model} not exist in database!`);
                            const vehicleType = new VehicleTypeModel({ name: {$eq: (relatedData.model).trim()} });
                            await vehicleType.save();
                            relatedData.model = vehicleType;
                        } else {
                            relatedData.model = await VehicleTypeModel.findOne({ name: {$eq: (relatedData.model).trim()} });
                        }
                    }
                    await VehicleModel.updateOne({_id: vehicle.id}, {$set : relatedData})
                } else {
                    noData += 1;
                }
            }
            console.log(`has Data: ${hasData} ---  no Data: ${noData}`);
        });
}

updateVehiclesData()
    .then(mongoose.disconnect);