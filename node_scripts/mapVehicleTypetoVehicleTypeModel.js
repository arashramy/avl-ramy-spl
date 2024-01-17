require('../database');
const { VehicleModel } = require('../models/gpslocation');
const VehicleTypeModel = require('../models/gpslocation/VehicleTypeModel');

async function run() {
    const getNameOfType = type => {
        switch (type) {
            case 'MOTOR':
                return 'موتورسیکلت';
            case 'CAR':
                return 'سواری';
            case 'PVAN':
                return 'وانت';
            case 'MVAN':
                return 'وانت';
            case 'KAMIOON':
                return 'کامیون';
            case 'KAMIOONET':
                return 'کامیون';
            default:
                return 'کامیون';
        }
    };
    VehicleModel.find().exec((error, vehicles) => {
        vehicles.map(async vehicle => {
            const typeName = getNameOfType(vehicle.type);
            const model = await VehicleTypeModel.findOne({
                name: typeName,
            });
            if (model === null) {
                console.log(`model ${vehicle.type} not exist`);
            } else {
                await vehicle.updateOne({ model });
                console.log('saved!');
            }
        });
    });
}

run().then(async () => {});
