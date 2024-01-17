/*eslint-disable */

const { VehicleModel } = require('../models/gpslocation');
const VehicleStatusModel = require('../models/gpslocation/VehicleStatusModel');
const { logger } = require('../utility/customlog');
const cron = require('node-cron');

class DeviceStatusCron {
    static async checkAllDevicesStatus() {
        try {
            const vehicle = await VehicleModel.find()
                .populate('lastLocation')
                .populate('vehicleStatus')
            let status = '';
            if (!vehicle) {
                logger.error('vehicle not found');
            } else {
                let now = new Date().AsDateJs();
                for (var i = 0; i < vehicle.length; i++) {
                    if (vehicle[i].vehicleStatus.status !== 'تصادفی' && vehicle[i].vehicleStatus.status !== 'در تعمیرگاه') {
                        if (!vehicle[i].lastLocation) {
                            status = 'بدون داده';
                        } else {
                            let lastLocationDate = vehicle[i].lastLocation.date;
                            let diffDays = Math.floor((now - lastLocationDate) / (1000 * 60 * 60 * 24));
                            if (diffDays < 1) {
                                status = 'به روز';
                            } else if (diffDays < 7 && diffDays >= 1) {
                                status = 'کمتر از یک هفته';
                            } else if (diffDays < 30 && diffDays >= 7) {
                                status = 'کمتر از یک ماه';
                            } else if (diffDays >= 30) {
                                status = 'بیش از یک ماه';
                            }
                        }

                        if (vehicle[i].vehicleStatus === undefined || vehicle[i].vehicleStatus.status !== status) {
                            let vehicleStatus = new VehicleStatusModel({
                                vehicleIMEI: vehicle[i].deviceIMEI,
                                status: status,
                                date: now,
                            });

                            await vehicleStatus.save();
                            vehicle[i].vehicleStatus = vehicleStatus._id;
                            vehicle[i].save();
                        }
                    }
                }
            }

        } catch (ex) {
            logger.error(ex);
        }
    }

    static run() {
        const EVERY_DAY_AT_8_AM = '0 8 * * *'; // 8 AM every day
        cron.schedule(EVERY_DAY_AT_8_AM, () => {
            DeviceStatusCron.checkAllDevicesStatus()
                .catch(e =>
                    logger.error(e)
                );
        });
    }
}

module.exports = { DeviceStatusCron };