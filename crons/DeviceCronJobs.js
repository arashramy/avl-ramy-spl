var schedule = require('node-cron').CronJob;
var datejs = require('safe_datejs');
const {
    GPSDataModel,
    VehicleModel,
    VehicleAlarmModel: AlarmModel,
} = require('../models/gpslocation');
var { SMSGW } = require('../utility/smsgw');
const { logger } = require('../utility/customlog');
var geolib = require('geolib');


var CronJob = function () {
    var m_checkPmDistanceIns;

    var checkPMDistance = function (IMEI, lastIndex, thr, phoneNumber, deviceId, sim) {
        try {
            if (lastIndex) {
                GPSDataModel.find(
                    {
                        $and: [
                            {IMEI: IMEI},
                            {'_id': {$gt: lastIndex}}
                        ]
                    }).exec(function (error, data) {
                    if (error) {
                        logger.error(error);
                    }
                    else if (!data) {
                        logger.debug('There is no gps data');
                    }
                    else {
                        var locations = new Array;
                        for (var i = 0; i < data.length; i++) {
                            locations.push({latitude: data[i].lat, longitude: data[i].lng});
                        }
                        var dist = (geolib.getPathLength(locations) / 1000.0).toFixed(2);
                        if (parseFloat(dist) > parseFloat(thr)) {
                            var newAlarm = new AlarmModel({
                                type: "Over Distance",
                                date: (new Date()).AsDateJs(),
                                vehicleId: deviceId,
                                desc: "most be " + thr + " but is " + dist
                            });
                            newAlarm.save(function(error){
                                if(!error){
                                    VehicleModel.findOne({'deviceIMEI': IMEI}).exec(function(error, vehicle){
                                        if(vehicle){
                                            vehicle.alarms.push(newAlarm._id);
                                            vehicle.save();
                                        }
                                    });
                                }
                            });

                            var header = "Kaveh AVL  \r\n";
                            var msg = header + "Your max distance for PM should be " + thr + " but your distance from last check is " + dist + " \r\n";
                            msg += "Sim Number: " + sim + " , IMEI: " + IMEI + "\r\n";
                            var sign = msg + " \r\n infinite secure life with Kaveh";
                            const numbers = [phoneNumber];
                            SMSGW().sendSmsToNumber(sign, numbers);
                        }
                    }
                })
            }
            else{
                GPSDataModel.find({IMEI: IMEI}).exec(function (error, data) {
                    if (error) {
                        logger.error(error);
                    }
                    else if (!data) {
                        logger.debug('There is no gps data');
                    }
                    else {
                        var locations = new Array;
                        for (var i = 0; i < data.length; i++) {
                            locations.push({latitude: data[i].lat, longitude: data[i].lng});
                        }
                        var dist = (geolib.getPathLength(locations) / 1000.0).toFixed(2);
                        if (parseFloat(dist) > parseFloat(thr)) {
                            var newAlarm = new AlarmModel({
                                type: "Over Distance",
                                date: (new Date()).AsDateJs(),
                                vehicleId: deviceId,
                                desc: "most be " + thr + " but is " + dist
                            });
                            newAlarm.save(function(error){
                                if(!error){
                                    VehicleModel.findOne({'deviceIMEI': IMEI}).exec(function(error, vehicle){
                                        if(vehicle){
                                            vehicle.alarms.push(newAlarm._id);
                                            vehicle.save();
                                        }
                                    });
                                }
                            });

                            var header = "Kaveh AVL  \r\n";
                            var msg = header + "Your max distance for PM should be " + thr + " but your distance from last check is " + dist + " \r\n";
                            msg += "Sim Number: " + sim + " , IMEI: " + IMEI + "\r\n";
                            var sign = msg + " \r\n infinite secure life with Kaveh";
                            const numbers = [phoneNumber];
                            SMSGW().sendSmsToNumber(sign, numbers);
                        }
                    }
                })
            }
        }
        catch(ex){
            logger.error(ex);
        }
    }

    var checkAllPMDistance = function () {
        try {

            m_checkPmDistanceIns = new CronJob('00 00 12 * * 1-7', function() {
                    VehicleModel.find().exec(function (error, vehicles) {
                        if (error) {
                            logger.error(error);
                        }
                        else if (!vehicle) {
                            logger.debug('vehicle not found');
                        }
                        else {
                            for(var i = 0 ; i < vehicles.length; i++){
                                checkPMDistance(vehicles[i].deviceIMEI, vehicles[i].lastPMIndex, vehicles[i].maxPMDistance, vehicles[i].driverPhoneNumber, vehicles[i]._id, vehicles[i].simNumber);
                            }
                        }
                    });
                }, function () {
                    /* This function is executed when the job stops */
                },
                true, /* Start the job right now */
                "UTC" /* Time zone of this job. */
            );
        }
        catch (ex) {
            logger.error(ex);
        }
    }

    var startScheduleEngine = function () {
        logger.debug("start PM Check Scheduler");
        checkAllPMDistance();
    }

    return {
        startScheduleEngine: startScheduleEngine
    }
}

module.exports.CronJob = CronJob;
