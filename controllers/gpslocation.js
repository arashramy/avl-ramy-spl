var mongoose = require('mongoose');

var jade = require('jade');
var pdf = require('html-pdf');
var path = require('path');
var moment = require('moment');

var NodeGeocoder = require("node-geocoder");
var templatesDir = path.resolve(__dirname, '..', 'template');
const { logger } = require('../utility/customlog');
const { GPSDataModel, VehicleModel } = require('../models/gpslocation');
const { AddressCache } = require('../utility/addresscache');

function GPSDataController() {

    function getGPSData(req, res) {
        try {
            GPSDataModel.find().exec(function (err, data) {
                if (err) {
                    logger.error(err);
                    return res({
                        msg: err
                    }).code(500);
                }
                else if (!data) {
                    return res({
                        msg: 'There is no gps data'
                    }).code(404);
                }
                else {
                    return res(data).code(200);
                }
            })
        }
        catch (ex) {
            logger.error(ex);
            return res({
                msg: ex
            }).code(404);
        }
    }

    function getGPSDataIMEI(req, res) {
        try {
            const vehicleId = req.params.id;
            let { count } = req.params;
            let { skip } = req.params;

            if (!vehicleId) {
                return res({
                    msg: 'vehicle not found',
                    code: '422',
                    validate: false,
                    field: 'vehicleId',
                }).code(422);
            }
            count = !count || !+count ? 10 : +count;
            skip = !skip || !+skip ? 0 : +skip;
            console.log(count,skip,"this is count and skip")
            GPSDataModel.find({ vehicleId })
                .skip(skip)
                .limit(count)
                .sort({ date: -1 })
                .exec(function(err, data) {
                    if (err) {
                        logger.error(err);
                        return res({
                            msg: err,
                        }).code(500);
                    } else if (!data) {
                        return res({
                            msg: 'There is no gps data',
                        }).code(404);
                    }
                    return res(data).code(200);
                });
        } catch (ex) {
            logger.error(ex);
            return res({
                msg: ex,
            }).code(404);
        }
    }

    function getAllIMEIs(req, res){
        try{
            GPSDataModel.aggregate([
                {
                    $group: {
                        _id: '$IMEI',
                        count: { $sum: 1}
                    }
                }
            ], function (err, result) {
                if (err) {
                    logger.error(ex);
                    return res({
                        msg: err
                    }).code(500);
                } else {
                    return res(result).code(200);
                }
            });
        }
        catch(ex){
            logger.error(ex);
            return res({
                msg: ex
            }).code(500);
        }
    }

    function getNLastDataIMEI(req, res){
        try{
            var IMEI = req.params.IMEI;
            var count = req.params.count;
            if(!IMEI){
                return res({
                    msg: "IMEI required",
                    code: "422",
                    validate: false,
                    field: "IMEI"
                }).code(422);
            }

            if(!count) count = 10;

            GPSDataModel.find({IMEI: IMEI}).sort({date:-1}).limit(count).exec(function (err, data) {
                if (err) {
                    logger.error(err);
                    return res({
                        msg: err
                    }).code(500);
                }
                else if (!data) {
                    return res({
                        msg: 'There is no gps data'
                    }).code(404);
                }
                else {
                    VehicleModel.findOne({'deviceIMEI': IMEI}).exec(function(err, vehicle){
                        if (err) {
                            logger.error(err);
                            return res({
                                msg: err
                            }).code(500);
                        }
                        else if (!vehicle) {
                            return res({
                                msg: 'There is no vehicle'
                            }).code(404);
                        }
                        else{
                            if(data[0]) {
                                var oneDay = 24 * 60 * 60 * 1000;
                                var startDate = new Date(data[0].date);
                                var endDate = new Date();
                                var remainingDate = Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / (oneDay)));
                                data[0].lastLocationDiff = remainingDate;
                            }
                            return res(data).code(200);
                        }
                    });

                }
            })
        }
        catch(ex){
            logger.error(ex);
            return res({
                msg: ex
            }).code(500);
        }
    }

    var getGPSDataIMEIReport = function(req, res){
        try{
            var IMEI = req.params.IMEI;
            if(!IMEI){
                return res({
                    msg: "IMEI required",
                    code: "422",
                    validate: false,
                    field: "IMEI"
                }).code(422);
            }

            GPSDataModel.find({IMEI: IMEI}).sort({date:-1}).exec(function (err, data) {
                if (err) {
                    logger.error(err);
                    return res({
                        msg: err
                    }).code(500);
                }
                else if (!data) {
                    return res({
                        msg: 'There is no gps data'
                    }).code(404);
                }
                else {
                    var locals = {
                        locations: data,
                        IMEI: IMEI
                    }
                    var html = jade.renderFile(templatesDir + "/report/devicelocation.jade", locals);
                    pdf.create(html, { "orientation": "landscape", "border": "1"}).toFile("report.pdf", function(err, stream){
                        res.file(stream.filename);
                    });
                }
            })

        }
        catch(ex){
            logger.error(ex);
            return res({
                msg: ex
            }).code(500);
        }
    }

    var updateAddressOfLocations = function(req ,res){
        try{
            GPSDataModel.find().sort({date:-1}).exec(function (err, data) {
                if (err) {
                    logger.error(err);
                    return res({
                        msg: err
                    }).code(500);
                }
                else if (!data) {
                    return res({
                        msg: 'There is no gps data'
                    }).code(404);
                }
                else {
                    {
                        var reverseTraverse = function(data, index){
                            if(data[index]) {
                                var tmpData = data[index];
                                    new AddressCache()
                                        .findAddress(tmpData.lat, tmpData.lng)
                                        .then(addr => {
                                            if (addr) {
                                                tmpData.address = addr;
                                                tmpData.save();
                                                reverseTraverse(
                                                    data,
                                                    index + 1
                                                );
                                            }
                                        })
                                        .catch(e => logger.error(e));
                            }
                            else return;
                        }
                        reverseTraverse(data, 0);

                    }
                    return res({msg: "Done"}).code(200);
                }});
        }
        catch(ex){
            logger.error(ex);
            return res({
                msg: ex
            }).code(500);
        }
    }

    return{
        getGPSData: getGPSData,
        getGPSDataIMEI: getGPSDataIMEI,
        getAllIMEIs: getAllIMEIs,
        getNLastDataIMEI: getNLastDataIMEI,
        getGPSDataIMEIReport: getGPSDataIMEIReport,
        updateAddressOfLocations: updateAddressOfLocations
    }
}

module.exports.GPSDataController = GPSDataController;
