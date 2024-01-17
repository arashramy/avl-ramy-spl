/*eslint-disable */
const {
    VehicleModel,
    VehicleAlarmModel
} = require('../models/gpslocation');
const { logger } = require('../utility/customlog');
const cron = require('node-cron');
const moment = require('moment');
const { SMSGW } = require('../utility/smsgw');
const { util } = require('../utility/util');
const { DelayLocation } = require('../template/sms/alarms');
const smsgw = SMSGW();
const jalali_moment = require('moment-jalaali');

class DeviceCheckLastLocationDelayCron {
    static async checkLastLocationDelay() {
        console.log("checkLastLocationDelay")

        try {
            const today = new Date();
            let delays = [];
            ['کاوه سودا', 'کاوه سیلیس', 'فلوت کاویان', 'متانول کاوه', 'کربنات کاوه', 'ابهر سیلیس', 'مظروف یزد', 'دفتر مرکزی'].map((group) => {
                delays.push({
                    groupName: group,
                    vehicles: [],
                    receivers: this.getReceivers(group)
                });
            });

            VehicleModel.find()
                .select('_id deviceIMEI lastLocation driverName plate')
                .populate('lastLocation')
                .populate({
                    path: 'groups',
                    select: 'name'
                })
                .exec((err, vehicles) => {
                    if (err) {
                        logger.error(err);
                        return;
                    }
                    const result = vehicles.map(async vehicle => {
                        try {
                            const lastLocationDurationDays = vehicle.lastLocation ? moment.duration(today.getTime() - vehicle.lastLocation.date.getTime())
                                .asDays() : 0;
                            const lastVehicleDelayAlarm = await VehicleAlarmModel.findOne({
                                vehicleId: vehicle._id,
                                type: 'Delay Alarm'
                            }, 'date')
                                .sort({ date: -1 });
                                console.log(lastVehicleDelayAlarm,"lastVehicleDelayAlarm")
                                console.log(vehicle,"vehicle")
                                console.log(vehicle._id,"_id")

                            if (lastLocationDurationDays > 5 &&
                                (
                                    !lastVehicleDelayAlarm ||
                                    (lastVehicleDelayAlarm && moment.duration(today.getTime() - new Date(lastVehicleDelayAlarm.date).getTime())
                                        .asDays() > 5)
                                ) &&
                                vehicle.groups[0] !== undefined
                            ) {
                                if (vehicle.groups[0].name !== 'اسقاطی') {
                                    const newAlarm = new VehicleAlarmModel({
                                        type: 'Delay Alarm',
                                        date: (new Date()).AsDateJs(),
                                        vehicleId: vehicle._id,
                                        desc: 'location not received for ' + Math.floor(lastLocationDurationDays) + ' days'
                                    });
                                    await newAlarm.save();
                                    const delayIndex = delays.findIndex(delay => delay.groupName === vehicle.groups[0].name);
                                    delays[delayIndex].vehicles.push({
                                        IMEI: vehicle.deviceIMEI,
                                        driverName: vehicle.driverName,
                                        plate: vehicle.plate,
                                        lastLocationDurationDays: Math.floor(lastLocationDurationDays),
                                    });
                                }
                            }
                            return delays;
                        } catch (e) {
                            logger.error(e);
                        }
                    });
                    Promise.all(result)
                        .then(async (values) => {
                            this.sendDelaySmsToAdmins(values, today);
                        });
                });
        } catch (ex) {
            logger.error(ex);
        }
    }


    static sendDelaySmsToAdmins(delays, today) {
        delays[0].map(delay => {
            if (delay.vehicles.length > 0) {
                const {
                    groupName,
                    vehicles,
                    receivers
                } = delay;
                let todayPersianDate = jalali_moment(
                    today.toISOString()
                        .replace('T', ' '),
                    'YYYY-M-D'
                )
                    .format('jYYYY/jM/jD');
                const context = {
                    groupName,
                    vehicles,
                    today: todayPersianDate,
                    subject: 'Kaveh AVL Delay Alarm',
                    alarmType: 'Delay Alarm',
                    email: receivers.email,
                };
                util.send_email('mail/alarms/delay', context, e => console.error(e));
                const message = DelayLocation(groupName, vehicles.length);
                smsgw.sendSmsToNumber(message, receivers.phone)
                    .catch(e => logger.error(e));
            }
        });

    }

    static getReceivers(groupName) {
        switch (groupName) {
            case "کاوه سودا":
              return {
                phone: ["09381378120", "09370713134"],
                email: ["ar-rahimi@kavehglass.com", "arashramy@gmail.com"],
              };
            case "کاوه سیلیس":
              return {
                phone: ["09381378120", "09370713134"],
                email: ["ar-rahimi@kavehglass.com", "arashramy@gmail.com"],
              };
            case "فلوت کاویان":
              return {
                phone: ["09381378120", "09370713134"],
                email: ["ar-rahimi@kavehglass.com", "arashramy@gmail.com"],
              };
            case "متانول کاوه":
              return {
                phone: ["09381378120", "09370713134"],
                email: ["ar-rahimi@kavehglass.com", "arashramy@gmail.com"],
              };
            case "کربنات کاوه":
              return {
                phone: ["09381378120", "09370713134"],
                email: ["ar-rahimi@kavehglass.com", "arashramy@gmail.com"],
              };
            case "ابهر سیلیس":
              return {
                phone: ["09381378120", "09370713134"],
                email: ["ar-rahimi@kavehglass.com", "arashramy@gmail.com"],
              };
            case "مظروف یزد":
              return {
                phone: ["09381378120", "09370713134"],
                email: ["ar-rahimi@kavehglass.com", "arashramy@gmail.com"],
              };
            case "دفتر مرکزی":
              return {
                phone: ["09381378120", "09370713134"],
                email: ["ar-rahimi@kavehglass.com", "arashramy@gmail.com"],
              };
          }
    }


    static run() {

        (function () {
            console.log("func runned")

        // const EVERY_DAY_AT_8_AM = '45 6 * * *'; // 6:45 AM every day
        // cron.schedule(EVERY_DAY_AT_8_AM, () => {
            DeviceCheckLastLocationDelayCron.checkLastLocationDelay()
                .catch(e => logger.error(e));
        // });
         })();
    }
}

module.exports = { DeviceCheckLastLocationDelayCron };