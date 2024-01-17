/*eslint-disable */

const {
    VehicleModel,
    GPSDataModel
} = require('../models/gpslocation');
const { logger } = require('../utility/customlog');
const cron = require('node-cron');
const geolib = require('geolib');
const moment = require('moment-jalaali');
const { fixLastLocation } = require('../node_scripts/populateVehicleGPSDataRelatedValues');

class DeviceMonthlyDistanceCron {
    static async setDeviceDistance() {
        try {
            const now = new Date();
            const firstDayOfMonthGregorianDate = moment(now).startOf('jMonth');
            const lastDayOfMonthGregorianDate = moment(now).endOf('jMonth');
            const zeroLocations = await GPSDataModel.deleteMany({lat: 0, lng: 0})
            logger.info(
                `${zeroLocations.deletedCount} instances of ${
                    GPSDataModel.modelName
                } created before ${lastDayOfMonthGregorianDate} has been deleted on ${now}`
            );
            fixLastLocation();
            const vehicles = await VehicleModel.find({})
                .select('_id deviceIMEI');
            if (!vehicles) {
                logger.error('There is no vehicle!');
            } else {
                vehicles.map(async (vehicle) => {
                    const locations = await GPSDataModel.aggregate()
                        .match(
                            {
                                $and: [
                                    { IMEI: vehicle.deviceIMEI },
                                    { date: { $gte: new Date(firstDayOfMonthGregorianDate) } },
                                    { date: { $lte: new Date(lastDayOfMonthGregorianDate) } },
                                ]
                            })
                        .project({
                            lat: 1,
                            lng: 1,
                            date: 1
                        });
                    locations.sort(function (a, b) {
                        return new Date(b.date) - new Date(a.date);
                    });
                    const vehicleLocations = locations.map(
                        ({
                            lat,
                            lng
                        }) => ({
                            latitude: lat,
                            longitude: lng
                        })
                    );
                    vehicle.currentMonthDistance = (geolib.getPathLength(vehicleLocations) / 1000.0).toFixed(2);
                    vehicle.save();
                });
            }
        } catch (ex) {
            logger.error(ex);
        }
    }

    static run() {
        const EVERY_DAY_AT_1_AM = '0 2 * * *'; // 2 AM every day
        cron.schedule(EVERY_DAY_AT_1_AM, () => {
            DeviceMonthlyDistanceCron.setDeviceDistance()
                .catch(e =>
                    logger.error(e)
                );
        });
    }
}

module.exports = { DeviceMonthlyDistanceCron };