/*eslint-disable */

var mongoose = require('mongoose');
var datejs = require('safe_datejs');
var moment = require('moment-jalaali');
var jade = require('jade');
var path = require('path');
var pdf = require('html-pdf');
var geolib = require('geolib');

var DeviceController = require("../controllers/device").DeviceController;
const { logger } = require('../utility/customlog');
const { DeviceGroupModel } = require('../models/devicegroup');
const { GPSDataModel, VehicleModel } = require('../models/gpslocation');
const { UserModel } = require('../models/user');

var templatesDir = path.resolve(__dirname, '..', 'template');

function DeviceGroupController() {

    function getDeviceGroups(req, res) {
        try {
            var userId = req.user._id;
            DeviceGroupModel.find({ $or: [{ user: userId }, { sharees: userId }] })
                .populate({
                    path: 'devices',
                    select: '_id simNumber deviceIMEI type plate driverName driverPhoneNumber gpsDataCount model',
                    populate: {
                        path: 'model',
                        select: { name: 1, _id: 0 }
                    }
                })
                .populate('sharees').exec(function (error, dgs) {
                if (error) {
                    logger.error(error);
                    return res({
                        msg: error
                    }).code(500);
                }
                else if (!dgs) {
                    return res({
                        msg: 'There is no device group'
                    }).code(404);
                }
                else {
                    return res(dgs).code(200);
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

    function getDeviceGroupById(req, res) {
        try {
            var userId = req.user._id;
            var groupId = req.params.groupId;

            DeviceGroupModel.findOne({$and : [{user: userId}, {'_id': groupId}]})
                .populate('devices')
                .populate({
                    path:'sharees',
                    populate: {
                        path: 'deviceModel',
                        select: {name: 1, _id: 0}
                    }
                })
                .exec(function (error, dgs) {
                if (error) {
                    logger.error(error);
                    return res({
                        msg: error
                    }).code(500);
                }
                else if (!dgs) {
                    return res({
                        msg: 'There is no device group'
                    }).code(404);
                }
                else {
                    return res(dgs).code(200);
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

    function addDeviceGroup(req, res) {
        try {
            var name = req.payload.name;
            var desc = req.payload.desc;
            var userId = req.user._id;
            var newDeviceGroup = new DeviceGroupModel({
                name: name,
                createDate: (new Date()).AsDateJs(),
                desc: desc,
                status: true,
                user: userId
            });
            newDeviceGroup.save(function (error) {
                if (error) {
                    return res({
                        msg: err
                    }).code(404);
                }
                else {
                    return res(newDeviceGroup).code(200);
                }
            });
        }
        catch (ex) {
            logger.error(ex);
            return res({
                msg: ex
            }).code(404);
        }
    }

    function addVehicleToGroup(req, res) {
        try {
            var vehicleId = req.payload.vehicleId;
            var groupId = req.payload.groupId;
            var userId = req.user._id;
            DeviceGroupModel.findOne({
                $and: [
                    {user: userId},
                    {'_id': groupId}
                ]
            }).exec(function (err, dgs) {
                if (err) {
                    logger.error(err);
                    return res({
                        msg: err
                    }).code(500);
                }
                else if (!dgs) {
                    return res({
                        msg: 'There is no device group'
                    }).code(404);
                }
                else {
                    VehicleModel.findOne({'_id': vehicleId}).exec(function (err, vehicle) {
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
                        else {
                            if (!dgs.devices)
                                dgs.devices = new Array;
                            if (dgs.devices.indexOf(vehicleId) < 0) {
                                dgs.devices.push(vehicleId);
                            }
                            dgs.save();
                            return res(vehicle).code(200);
                        }
                    });
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

    function editGroup(req, res) {
        try {
            var groupId = req.payload.groupId;
            var name = req.payload.name;
            var desc = req.payload.desc;
            var color = req.payload.color;
            var userId = req.user._id;  

            DeviceGroupModel.findOne({
                $and: [
                    {user: userId},
                    {'_id': groupId}
                ]
            }).exec(function (err, dgm) {
                if (err) {
                    logger.error(err);
                    return res({
                        msg: err
                    }).code(500);
                }
                else if (!dgm) {
                    return res({
                        msg: 'There is no device group'
                    }).code(404);
                }
                else {
                    name && (dgm.name = name);
                    desc && (dgm.desc = desc);
                    color && (dgm.color = color);
                    dgm.save(function (err) {
                        if (err) {
                            return res({
                                msg: err
                            }).code(500);
                        }
                        else {
                            return res(dgm).code(200);
                        }
                    });
                }
            });
        }
        catch (ex) {
            logger.error(ex);
            return res({
                msg: ex
            }).code(404);
        }
    }

    function removeVehicleFromGroup(req, res) {
        try {
            var vehicleId = req.params.vehicleId;
            var groupId = req.params.groupId;
            var userId;
            if (req.user)
                userId = req.user._id;
            DeviceGroupModel.findOne({
                $and: [
                    {user: userId},
                    {'_id': groupId}
                ]
            }).exec(function (err, dgs) {
                if (err) {
                    logger.error(err);
                    return res({
                        msg: err
                    }).code(500);
                }
                else if (!dgs) {
                    return res({
                        msg: 'There is no device group'
                    }).code(404);
                }
                else {
                    VehicleModel.findOne({'_id': vehicleId}).exec(function (err, vehicle) {
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
                        else {
                            if (!dgs.devices)
                                dgs.devices = new Array;
                            if (dgs.devices.indexOf(vehicleId) >= 0) {
                                dgs.devices.splice(dgs.devices.indexOf(vehicleId), 1);
                            }
                            dgs.save();
                            return res(vehicle).code(200);
                        }
                    });
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

    function getUserDeviceGroups(req, res) {
        try {
            var userId = req.params.id;
            DeviceGroupModel.find({'user': userId}).exec(function (err, dgm) {
                if (err) {
                    logger.error(err);
                    return res({
                        msg: err
                    }).code(500);
                }
                else if (!dgm) {
                    return res({
                        msg: 'There is no device group'
                    }).code(404);
                }
                else {
                    return res(dgm).code(200);
                }
            });
        }
        catch (ex) {
            logger.error(ex);
            return res({
                msg: ex
            }).code(404);
        }
    }

    function shareGroupsWithUser(req, res){
        try{
            var userId = req.user._id;
            var groupId = req.payload.groupId;
            var sharee = req.payload.sharee;
            if (!sharee) {
                return res({
                    msg: "sharee required",
                    code: "422",
                    validate: false,
                    field: "sharee"
                }).code(422);
            }
            DeviceGroupModel.findOne({ $and : [{user: userId} , {'_id': groupId}]}).populate('devices').exec(function (err, dgs) {
                if (err) {
                    logger.error(err);
                    return res({
                        msg: err
                    }).code(500);
                }
                else if (!dgs) {
                    return res({
                        msg: 'There is no device group'
                    }).code(404);
                }
                else {
                    if (!dgs.sharees)
                        dgs.sharees = new Array;
                    if (dgs.sharees.indexOf(sharee) < 0) {
                        dgs.sharees.push(sharee);
                        dgs.save();
                        return res({group: dgs, sharee: sharee}).code(200);
                    }
                    else{
                        return res({msg: "duplicate"}).code(400);
                    }

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

    function unshareGroupsWithUser(req, res){
        try{
            var userId = req.user._id;
            var groupId = req.payload.groupId;
            var sharee = req.payload.sharee;
            if (!sharee) {
                return res({
                    msg: "sharee required",
                    code: "422",
                    validate: false,
                    field: "sharee"
                }).code(422);
            }
            DeviceGroupModel.findOne({ $and : [{user: userId} , {'_id': groupId}]}).populate('devices').exec(function (err, dgs) {
                if (err) {
                    logger.error(err);
                    return res({
                        msg: err
                    }).code(500);
                }
                else if (!dgs) {
                    return res({
                        msg: 'There is no device group'
                    }).code(404);
                }
                else {
                    if (!dgs.sharees)
                        dgs.sharees = new Array;
                    if (dgs.sharees.indexOf(sharee) >= 0) {
                        dgs.sharees.splice(dgs.sharees.indexOf(sharee), 1);
                        dgs.save();
                        return res({group: dgs, sharee: sharee}).code(200);
                    }
                    else{
                        return res({msg: "does bot exist"}).code(404);
                    }

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

    function getVehiclesofGroup(req, res) {
        try {
            var groupId = req.params.groupId;
            var userId = req.user._id;
            DeviceGroupModel.findOne({
                $and: [
                    { $or: [{user: userId}, {sharees: userId}] },
                    {'_id': groupId}
                ]
            }).populate({
                    path: 'devices',
                    select: '_id simNumber deviceIMEI vehicleName type plate driverName driverPhoneNumber model',
                    populate: {
                        path: 'model',
                        select: { name: 1, _id: 0 }
                    }
                }
            )
            
            
            
            
            // .exec(function (err, dgs) {
            //     if (err) {
            //         logger.error(err);
            //         return res({
            //             msg: err
            //         }).code(500);
            //     }
            //     else if (!dgs) {
            //         return res({
            //             msg: 'There is no device group'
            //         }).code(404);
            //     }
            //     else {
            //         var vehicles = dgs.devices;
            //         var result = new Array;
            //         for (var i = 0; i < vehicles.length; i++) {
            //             var tmpVehicle = {};
            //             var remainingDate = -1;
            //             tmpVehicle.deviceInfo = vehicles[i];
            //             if (vehicles[i].lastLocation) {
            //                 var oneDay = 24 * 60 * 60 * 1000;
            //                 var startDate = new Date(vehicles[i].lastLocation.date);
            //                 var endDate = new Date();
            //                 remainingDate = Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / (oneDay)));

            //             }
            //             tmpVehicle.lastLocationDiff = remainingDate;
            //             result.push(tmpVehicle);
            //         }
            //         res(result).code(200);
            //     }
            // })
        }
        catch (error) {
            // logger.error(ex);
            return res({
                message: "somthing went wrong in Get Vehicles Of Group  -9588o8"
                ,code :500
            })
        }
    }

    var getVehiclesofMultiGroup = function(req, res){
        try {
            var groupId = req.payload.groups;
            var userId = req.user._id;
            DeviceGroupModel.find({
                $and: [
                    // { $or: [{user: userId}, {sharees: userId}] },
                    {'_id': { $in : groupId}}
                ]
            })
            
            
            .populate('devices').exec(function (err, dgs) {
                if (err) {
                    logger.error(err);
                    return res({
                        msg: err
                    }).code(500);
                }
                else if (!dgs) {
                    return res({
                        msg: 'There is no device group'
                    }).code(404);
                }
                else {
                    var result = new Array;

                    for(var ii = 0 ; ii < dgs.length ; ii++) {
                        var vehicles = dgs[ii].devices;
                        for (var i = 0; i < vehicles.length; i++) {
                            var tmpVehicle = {};
                            var remainingDate = -1;
                            tmpVehicle.deviceInfo = vehicles[i];
                            if (vehicles[i].lastLocation) {
                                var oneDay = 24 * 60 * 60 * 1000;
                                var startDate = new Date(vehicles[i].lastLocation.date);
                                var endDate = new Date();
                                remainingDate = Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / (oneDay)));

                            }
                            tmpVehicle.lastLocationDiff = remainingDate;
                            result.push(tmpVehicle);
                        }
                    }
                    res(result).code(200);

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

    var reports = {
        reportVehicleOfGroups: function (req, res) {
            try {
                var groupId = req.params.groupId;
                var userId = req.params.userId;

                UserModel.findOne({'_id': userId}).exec(function (err, user) {
                    if (err) {
                        logger.error(err);
                        return res({
                            msg: err
                        }).code(500);
                    }
                    else if (!user) {
                        return res({
                            msg: 'There is no user data'
                        }).code(404);
                    }
                    else {
                        req.user = user;

                        DeviceGroupModel.findOne({
                            $and: [
                                { $or: [{user: userId}, {sharees: userId}] },
                                {'_id': groupId}
                            ]
                        }).populate('devices').populate('devices.gpsdata').exec(function (err, dgs) {
                            if (err) {
                                logger.error(err);
                                return res({
                                    msg: err
                                }).code(500);
                            }
                            else if (!dgs) {
                                return res({
                                    msg: 'There is no device group'
                                }).code(404);
                            }
                            else {
                                var devices = new Array;
                                var locals = {
                                    reportname: 'گزارش گروه ها',
                                    reporterName: req.user.firstname + " " + req.user.lastname,
                                    reportDate: moment().format('jYYYY/jM/jD HH:mm:ss'),
                                    reporterTel: req.user.mobileNumber,
                                    groupName: dgs.name,
                                    groupCount: dgs.devices.length,
                                    devices: devices
                                }
                                var innerTraverse = function (locals, index) {
                                    if (index < dgs.devices.length) {
                                        var device = dgs.devices[index];
                                        DeviceController().helpers.getPMDistance(device.deviceIMEI, device.lastPMIndex, device.maxPMDistance, function (dist) {
											GPSDataModel.find({IMEI: device.deviceIMEI}).sort({date: 1}).exec(function (err, data) {
													var result = data;
													locals.devices.push({
														IMEI: device.deviceIMEI,
														simNumber: device.simNumber,
														type: device.type,
														pmDistance: dist,
														maxPmDistance: device.maxPMDistance,
														lastLocationDate: result.length > 0 ? moment(moment(new Date(result[result.length - 1].date)).format("YYYY/MM/DD HH:mm:ss"), "YYYY/MM/DD HH:mm:ss").format('jYYYY/jM/jD HH:mm:ss') : '-----',
														lastLocationAddress: result.length > 0 ? result[result.length - 1].address : '-----'
													});
													innerTraverse(locals, index + 1);
											});
                                        });
                                    }
                                    else {
                                        var html = jade.renderFile(templatesDir + "/report/groupofdevice.jade", locals);
                                        var reportConfig = {
                                            "header": {
                                                "height": "15mm",
                                                "contents": '<div style="text-align: center; font-size: 10px;">' + locals.groupName + '</div><hr/>'
                                            },
                                            "footer": {
                                                "height": "15mm",
                                                "contents": '<hr/><span style="color: #444;font-size: 10px;">{{page}}</span>/<span>{{pages}}</span>'
                                            },
                                            "orientation": "portrait",
                                            "border": "1"
                                        }
                                        pdf.create(html, reportConfig).toFile("report.pdf", function (err, stream) {
                                            res.file(stream.filename);
                                        });
                                    }
                                }
                                innerTraverse(locals, 0);
                            }
                        })
                    }
                });
            }
            catch (ex) {
                logger.error(ex);
                return res({
                    msg: ex
                }).code(404);
            }
        }
    }

    return {
        getDeviceGroups: getDeviceGroups,
        getDeviceGroupById: getDeviceGroupById,
        addVehicleToGroup: addVehicleToGroup,
        addDeviceGroup: addDeviceGroup,
        editGroup: editGroup,
        removeVehicleFromGroup: removeVehicleFromGroup,
        getUserDeviceGroups: getUserDeviceGroups,
        getVehiclesofGroup: getVehiclesofGroup,
        shareGroupsWithUser: shareGroupsWithUser,
        unshareGroupsWithUser: unshareGroupsWithUser,
        getVehiclesofMultiGroup: getVehiclesofMultiGroup,
        reports: {
            reportVehicleOfGroups: reports.reportVehicleOfGroups
        }
    }
}

module.exports.DeviceGroupController = DeviceGroupController;
