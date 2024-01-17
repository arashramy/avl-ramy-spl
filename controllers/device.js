/*eslint-disable */

var mongoose = require('mongoose');
var datejs = require('safe_datejs');
var moment = require('moment-jalaali');

const {
    GPSDataModel,
    VehicleModel,
    VehicleAlarmModel,
} = require('../models/gpslocation');
const { DeviceGroupModel } = require('../models/devicegroup');
var GT06Controller = require('../controllers/GT06Controller').GT06Controller;
var MVT380Controller = require('../controllers/MVT380Controller')
    .MVT380Controller;
const { NotifyUtility } = require('../controllers/NotifyUtility');
const GPSController = require('../controllers/GPSController');

var jade = require('jade');
var path = require('path');
var pdf = require('html-pdf');
var geolib = require('geolib');
const { logger } = require('../utility/customlog');
const { UserModel } = require('../models/user');
const VehicleStatusModel = require('../models/gpslocation/VehicleStatusModel');
const ActionEventModel = require('../models/gpslocation/ActionEventModel');
const PhoneBookModel = require('../models/user/phoneBookModel');
const VehicleTypeModel = require('../models/gpslocation/VehicleTypeModel');
const REPORT_TEMPLATE_DIR = path.resolve(__dirname, '..', 'template', 'report');

function DeviceController(arg) {
    function refreshDeviceLocations(req, res) {
        try {
            var IMEI = req.params.IMEI;
            if (!IMEI) {
                return res({
                    msg: 'IMEI required',
                    code: '422',
                    validate: false,
                    field: 'IMEI',
                }).code(422);
            } else {
                VehicleModel.findOne({ deviceIMEI: IMEI }).exec(function(
                    error,
                    vehicle
                ) {
                    if (err) {
                        return res({
                            msg: err,
                        }).code(500);
                    } else if (!vehicle) {
                        return res({
                            msg: 'vehicle not found',
                        }).code(404);
                    }
                    return res(vehicle).code(200);
                });
            }
        } catch (ex) {
            logger.error(ex);
            return res({
                msg: ex,
            }).code(404);
        }
    }

    function getDevices(req, res) {
        try {
            VehicleModel.find()
                .setAuthorizationUser(req.user)
                .select({
                    _id: 1,
                    deviceIMEI: 1,
                    driverName: 1,
                    driverPhoneNumber: 1,
                    gpsDataCount: 1,
                    lastLocation: 1,
                    plate: 1,
                    simNumber: 1,
                    trackerModel: 1,
                    vehicleName: 1,
                    speedAlarm: 1,
                    maxSpeed: 1,
                    maxPMDistance: 1,
                    createDate: 1,
                    permissibleZone: 1,
                    vehicleStatus: 1,
                    zoneAlarm: 1,
                    fuel: 1,
                    currentMonthDistance: 1,
                    usage: 1,
                    model: 1,
                })
                .populate('lastLocation')
                .populate({
                    path: 'speedAlarm.smsReceivers',
                    model: PhoneBookModel,
                    select: { firstName: 1, lastName: 1, phoneNumber: 1 },
                })
                .populate({
                    path: 'zoneAlarm.smsReceivers',
                    model: PhoneBookModel,
                    select: { firstName: 1, lastName: 1, phoneNumber: 1 },
                })
                .populate({ path: 'groups', select: 'name' })
                .populate('vehicleStatus')
                .populate({
                    path: 'model',
                    model: VehicleTypeModel,
                    select: { name: 1, _id: 0 },
                })
                .populate('permissibleZone')

                .sort({ _id: -1 })
                .lean()
                .exec((err, vehicles) => {
                    if (err) {
                        logger.error(err);
                        return res({
                            msg: err,
                        }).code(500);
                    }
                    if (!vehicles) {
                        return res({
                            msg: 'There is no vehicles',
                        }).code(404);
                    }
                    const getElapsedDate = date => {
                        const oneDay = 24 * 60 * 60 * 1000;
                        const now = new Date();
                        return Math.floor(Math.abs((now - date) / oneDay));
                    };
                    const result = vehicles.map(vehicle => {
                        const { lastLocation, deviceInfo } = vehicle;
                        return {
                            deviceInfo: vehicle,
                            lastLocationDiff: lastLocation
                                ? getElapsedDate(lastLocation.date)
                                : -1,
                        };
                    });
                    return res(result).code(200);
                });
        } catch (ex) {
            logger.error(ex);
            return res({
                msg: ex,
            }).code(404);
        }
    }

    function getLastLocationsOfDeviceInP(req, res) {
        try {
            var devices = req.payload.devices;
            var bTime = req.payload.bTime;
            var eTime = req.payload.eTime;

            var hexSeconds = Math.floor(bTime).toString(16);
            var bId = mongoose.Types.ObjectId(hexSeconds + '0000000000000000');

            var hexSeconds2 = Math.floor(eTime).toString(16);
            var eId = mongoose.Types.ObjectId(hexSeconds2 + '0000000000000000');

            var deviceCond = new Array();
            for (var i = 0; i < devices.length; i++) {
                deviceCond.push({ IMEI: devices[i] });
            }
            var findCondition = {
                $and: [
                    {
                        $or: deviceCond,
                    },
                    {
                        _id: {
                            $gte: mongoose.Types.ObjectId(bId),
                            $lte: mongoose.Types.ObjectId(eId),
                        },
                    },
                ],
            };

            GPSDataModel.find(findCondition).exec(function(err, locations) {
                if (err) {
                    logger.error(err);
                    return res({
                        msg: err,
                    }).code(500);
                } else if (!locations) {
                    return res({
                        msg: 'There is no vehicles',
                    }).code(404);
                } else {
                    return res({ locations: locations, code: 200 }).code(200);
                }
            });
        } catch (ex) {
            logger.error(ex);
            return res({
                msg: ex,
            }).code(404);
        }
    }

    function getLastLocationOfAllDevice(req, res) {
        try {
            VehicleModel.find({ lastLocation: { $ne: null } })
                .setAuthorizationUser(req.user)
                .select({
                    driverName: 1,
                    driverPhoneNumber: 1,
                    plate: 1,
                    simNumber: 1,
                    vehicleName: 1,
                    lastLocation: 1,
                    model: 1,
                })
                .populate({ path: 'model', select: { name: 1, _id: 0 } })
                .populate('lastLocation')
                .exec(async (err, vehicles) => {
                    if (err) {
                        logger.error(err);
                        return res({
                            msg: err,
                        }).code(500);
                    }
                    if (!vehicles) {
                        return res({
                            msg: 'There is no vehicles',
                        }).code(404);
                    }

                    const result = await vehicles.map(async vehicle => {
                        const group = await DeviceGroupModel.findOne(
                            { devices: vehicle._id },
                            'name color'
                        );
                        const {
                            model,
                            vehicleName,
                            driverName,
                            simNumber,
                            driverPhoneNumber,
                            plate,
                            lastLocation: { lat, lng, IMEI, date, speed },
                        } = vehicle;
                        return {
                            deviceInfo: {
                                model,
                                vehicleName,
                                driverName,
                                simNumber,
                                driverPhoneNumber,
                                plate,
                            },
                            lastLocation: {
                                lat,
                                lng,
                                IMEI,
                                date,
                                speed,
                            },
                            group,
                        };
                    });
                    Promise.all(result).then(values => {
                        return res(values).code(200);
                    });
                });
        } catch (ex) {
            logger.error(ex);
            return res({
                msg: ex,
            }).code(404);
        }
    }

    async function addDevice(req, res) {
        try {
            var simNumber = req.payload.simNumber;
            var deviceIMEI = req.payload.deviceIMEI;
            var createDate = new Date().AsDateJs();
            var creator = req.user._id;
            var plate = req.payload.plate;
            var name = req.payload.name;
            var driverName = req.payload.driverName;
            var driverPhoneNumber = req.payload.driverPhoneNumber;
            var trackerModel = req.payload.trackerModel;
            var fuel = req.payload.fuel;
            var model = req.payload.model;
            let usage = req.payload.usage;

            if (!simNumber) {
                return res({
                    msg: 'simNumber required',
                    code: '422',
                    validate: false,
                    field: 'simNumber',
                }).code(422);
            } else if (!deviceIMEI) {
                return res({
                    msg: 'deviceIMEI required',
                    code: '422',
                    validate: false,
                    field: 'deviceIMEI',
                }).code(422);
            } else if (!plate) {
                return res({
                    msg: 'plate required',
                    code: '422',
                    validate: false,
                    field: 'plate',
                }).code(422);
            } else if (!name) {
                return res({
                    msg: 'name required',
                    code: '422',
                    validate: false,
                    field: 'name',
                }).code(422);
            } else if (!model) {
                return res({
                    msg: 'type required',
                    code: '422',
                    validate: false,
                    field: 'type',
                }).code(422);
            }

            var newVehicle = new VehicleModel({
                simNumber: simNumber,
                deviceIMEI: deviceIMEI,
                status: true,
                createDate: createDate,
                creator: creator,
                vehicleName: name,
                plate: plate,
                model: await VehicleTypeModel.findOne({ name: model }),
                driverName: driverName,
                driverPhoneNumber: driverPhoneNumber,
                trackerModel: trackerModel,
                fuel: fuel,
                usage: usage,
            });

            await newVehicle.save(async function(err) {
                if (err) {
                    return res({
                        msg: err,
                    }).code(500);
                }

                // create a new vehicleStatusModel
                let vehicleStatus = new VehicleStatusModel({
                    vehicleIMEI: newVehicle.deviceIMEI,
                    status: 'بدون داده',
                    date: new Date().AsDateJs(),
                });

                await vehicleStatus.save();
                newVehicle.vehicleStatus = vehicleStatus._id;
                await newVehicle.save();

                return res(newVehicle).code(200);
            });
        } catch (ex) {
            logger.error(ex);
            return res({
                msg: ex,
            }).code(404);
        }
    }

    function editDevice(req, res) {
        try {
            var vehicleId = req.payload.vehicleId;
            var simNumber = req.payload.simNumber;
            var deviceIMEI = req.payload.deviceIMEI;
            var plate = req.payload.plate;
            var name = req.payload.name;
            var driverName = req.payload.driverName;
            var driverPhoneNumber = req.payload.driverPhoneNumber;
            var trackerModel = req.payload.trackerModel;
            var fuel = req.payload.fuel;
            var model = req.payload.modelName;
            let usage = req.payload.usage;

            if (!vehicleId) {
                return res({
                    msg: 'vehicleId required',
                    code: '422',
                    validate: false,
                    field: 'vehicleId',
                }).code(422);
            } else {
                VehicleModel.findOne({ _id: vehicleId }).exec(async function(
                    err,
                    vehicle
                ) {
                    if (err) {
                        return res({
                            msg: err,
                        }).code(500);
                    } else if (!vehicle) {
                        return res({
                            msg: 'vehicle not found',
                        }).code(404);
                    } else if (vehicle.deviceIMEI !== deviceIMEI) {
                        if (VehicleModel.exists({ deviceIMEI: deviceIMEI })) {
                            return res({
                                msg: 'وسیله نقلیه دیگری با این IMEI موجود است',
                            }).code(406);
                        }
                    } else {
                        const oldVehicle = { ...vehicle._doc };
                        simNumber && (vehicle.simNumber = simNumber);
                        deviceIMEI && (vehicle.deviceIMEI = deviceIMEI);
                        plate && (vehicle.plate = plate);
                        name && (vehicle.vehicleName = name);
                        model &&
                            (vehicle.model = await VehicleTypeModel.findOne({
                                name: model,
                            }));
                        driverName && (vehicle.driverName = driverName);
                        driverPhoneNumber &&
                            (vehicle.driverPhoneNumber = driverPhoneNumber);
                        trackerModel && (vehicle.trackerModel = trackerModel);
                        fuel && (vehicle.fuel = fuel);
                        usage && (vehicle.usage = usage);

                        await vehicle.save(async function(err) {
                            if (err) {
                                return res({
                                    msg: err,
                                }).code(500);
                            } else {
                                // create new event for changing name and phone number of driver
                                for (let fieldName of [
                                    'driverName',
                                    'driverPhoneNumber',
                                ]) {
                                    let vehicleEvent;
                                    if (
                                        vehicle[fieldName] !==
                                        oldVehicle[fieldName]
                                    ) {
                                        vehicleEvent = new ActionEventModel({
                                            userId: req.user._id,
                                            date: new Date().AsDateJs(),
                                            objectModel: 'vehicle',
                                            objectId: vehicleId,
                                            actionType: 'update',
                                            fieldName,
                                            oldValue: oldVehicle[fieldName],
                                            newValue: vehicle[fieldName],
                                        });
                                        await vehicleEvent.save();
                                    }
                                }
                                return res(vehicle).code(200);
                            }
                        });
                    }
                });
            }
        } catch (ex) {
            logger.error(ex);
            return res({
                msg: ex,
            }).code(500);
        }
    }

    var getDeviceByIMEI = function(req, res) {
        try {
            var IMEI = req.params.IMEI;
            if (!IMEI) {
                return res({
                    msg: 'IMEI required',
                    code: '422',
                    validate: false,
                    field: 'IMEI',
                }).code(422);
            } else {
                VehicleModel.findOne({ deviceIMEI: IMEI }).exec(function(
                    err,
                    vehicle
                ) {
                    if (err) {
                        return res({
                            msg: err,
                        }).code(500);
                    } else if (!vehicle) {
                        return res({
                            msg: 'vehicle not found',
                        }).code(404);
                    } else {
                        return res(vehicle).code(200);
                    }
                });
            }
        } catch (ex) {
            logger.error(ex);
            return res({
                msg: ex,
            }).code(404);
        }
    };

    const deleteDevice = async (req, res) => {
        try {
            const { IMEI } = req.params;
            if (!IMEI) {
                return res({
                    msg: 'IMEI required',
                    code: '422',
                    validate: false,
                    field: 'IMEI',
                }).code(422);
            }
            const vehicle = await VehicleModel.findOne({ deviceIMEI: IMEI });
            if (!vehicle) {
                return res({ msg: 'There is no vehicle data' }).code(404);
            }
            vehicle.remove();
            return res({ msg: 'deleted' }).code(200);
        } catch (ex) {
            logger.error(ex);
            return res({ msg: ex }).code(500);
        }
    };

    var getDeviceGroups = function(req, res) {
        try {
            var IMEI = req.params.IMEI;
            VehicleModel.findOne({ deviceIMEI: IMEI })
                .populate('groups')
                .exec(function(err, vehicle) {
                    if (err) {
                        return res({
                            msg: err,
                        }).code(500);
                    } else if (!vehicle) {
                        return res({
                            msg: 'vehicle not found',
                        }).code(404);
                    } else {
                        return res(vehicle).code(200);
                    }
                });
        } catch (ex) {
            logger.error(ex);
            return res({
                msg: ex,
            }).code(404);
        }
    };

    var getDeviceAlarm = function(req, res) {
        try {
            var IMEI = req.params.IMEI;
            VehicleModel.findOne({ deviceIMEI: IMEI })
                .populate('alarms')
                .exec(function(err, vehicle) {
                    if (err) {
                        return res({
                            msg: err,
                        }).code(500);
                    } else if (!vehicle) {
                        return res({
                            msg: 'vehicle not found',
                        }).code(404);
                    } else {
                        return res(vehicle).code(200);
                    }
                });
        } catch (ex) {
            return res({
                msg: ex,
            }).code(404);
        }
    };

    var reports = {
        getPdfReport: (template, context) => {
            return new Promise((resolve, reject) => {
                const html = jade.renderFile(
                    path.resolve(REPORT_TEMPLATE_DIR, template),
                    context
                );
                const reportConfig = {
                    header: {
                        height: '15mm',
                        contents: `
                                <div style="text-align: center; font-size: 10px;">
                                    ${context.header} 
                                </div>
                                <hr/>
                            `,
                    },
                    footer: {
                        height: '15mm',
                        contents: `
                                <hr/>
                                <span style="color: #444;font-size: 10px;">{{page}}</span>
                                /<span>{{pages}}</span>
                            `,
                    },
                    orientation: 'portrait',
                    border: '1',
                    timeout: 100000,
                };
                const fileName = `${context.title
                    .toLowerCase()
                    .replace(/ /g, '-')}-${moment(context.date).format(
                    'jYYYY-jM-jD-HH-mm-ss'
                )}.pdf`;
                pdf.create(html, reportConfig).toFile(
                    `reports/${fileName}`,
                    (error, stream) => {
                        if (error) {
                            reject(error);
                        }
                        resolve(stream.filename);
                    }
                );
            });
        },
        getReportDevices: async req => {
            const { groupFilter, deviceFilter } = req.payload;
            const reportDevices = VehicleModel.find().setAuthorizationUser(
                req.user
            );
            if (groupFilter.length) {
                const groupDevices = await DeviceGroupModel.aggregate()
                    .match({
                        _id: {
                            $in: groupFilter.map(mongoose.Types.ObjectId),
                        },
                    })
                    .unwind('devices')
                    .group({ _id: null, devices: { $addToSet: '$devices' } });
                if (groupDevices && groupDevices.length)
                    reportDevices.find({
                        _id: { $in: groupDevices[0].devices },
                    });
            }
            
            if (deviceFilter.length) {
                reportDevices.find({
                    deviceIMEI: { $in: deviceFilter },
                });
            }
            return { reportDevices };
        },
        reportDeviceLocations: async (req, res) => {
            try {
                const {
                    type,
                    dateFilter: { start: startDate, end: endDate },
                    speedFilter: { min: minSpeed, max: maxSpeed },
                    timeFilter: { start: startTime, end: endTime },
                } = req.payload;
                if (
                    startDate &&
                    endDate &&
                    new Date(startDate) > new Date(endDate)
                ) {
                    throw new Error(
                        'تاریخ شروع گزارش نمی‌تواند از تاریخ پایان گزارش جلوتر باشد.'
                    );
                }
                if (startTime && endTime && startTime > endTime) {
                    throw new Error(
                        'ساعت شروع گزارش نمی‌تواند از ساعت پایان گزارش جلوتر باشد.'
                    );
                }
                if (minSpeed && maxSpeed && +minSpeed > +maxSpeed) {
                    throw new Error(
                        'کمینه سرعت گزارش نمی‌تواند از بیشینه سرعت گزارش بیشتر باشد.'
                    );
                }
                const { reportDevices } = await reports.getReportDevices(req);
                reportDevices.select({ deviceIMEI: 1 });
                const deviceIMEIs = (await reportDevices).map(
                    vehicle => vehicle.deviceIMEI
                );
                const deviceIds = (await reportDevices).map(
                    vehicle => vehicle._id
                );

                const reportLocations = GPSDataModel.aggregate()
                    .match({ vehicleId: { $in: deviceIds } })
                    .addFields({
                        dateCreated: {
                            $dateFromString: {
                                dateString: { $substr: ['$date', 0, 34] },
                            },
                        },
                        dateCreatedHour: {
                            $hour: {
                                date: {
                                    $dateFromString: {
                                        dateString: {
                                            $substr: ['$date', 0, 34],
                                        },
                                    },
                                },
                                timezone: 'Asia/Tehran',
                            },
                        },
                    });
                if (startDate) {
                    reportLocations.match({
                        dateCreated: { $gte: new Date(startDate) },
                    });
                }
                if (endDate) {
                    reportLocations.match({
                        dateCreated: { $lte: new Date(endDate) },
                    });
                }
                if (minSpeed) {
                    reportLocations.match({ speed: { $gte: +minSpeed } });
                }
                if (maxSpeed) {
                    reportLocations.match({ speed: { $lte: +maxSpeed } });
                }
                if (startTime) {
                    reportLocations.match({
                        dateCreatedHour: { $gte: startTime },
                    });
                }
                if (endTime) {
                    reportLocations.match({
                        dateCreatedHour: { $lt: endTime },
                    });
                }
                const vehiclesLocationData = await reportLocations
                    .group({
                        _id: '$vehicleId',
                        locations: {
                            $push: {
                                date: '$dateCreated',
                                latitude: '$lat',
                                longitude: '$lng',
                                address: '$address',
                                speed: '$speed',
                                url: '$url',
                            },
                        },
                        minSpeed: { $min: '$speed' },
                        maxSpeed: { $max: '$speed' },
                        avgSpeed: { $avg: '$speed' },
                        lastLocation: {
                            $last: { address: '$address', date: '$date' },
                        },
                    })
                    .lookup({
                        from: 'vehicles',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'device',
                    })
                    .unwind('device')
                    .lookup({
                        from: 'devicegroups',
                        localField: 'device._id',
                        foreignField: 'devices',
                        as: 'device.groups',
                    })
                    .replaceRoot({
                        $mergeObjects: [
                            '$$ROOT',
                            {
                                groups: '$device.groups.name',
                                device: {
                                    IMEI: '$device.deviceIMEI',
                                    type: '$device.type',
                                    simNumber: '$device.simNumber',
                                    fuel: '$device.fuel',
                                },
                                driver: {
                                    name: '$device.driverName',
                                    phoneNumber: '$device.driverPhoneNumber',
                                },
                            },
                        ],
                    });

                return res.json(vehiclesLocationData).code(200);
            } catch (ex) {
                console.log(ex)
                return res.json({ msg: ex.message }).code(404);
            }
        },
        exportDeviceLocationsReportToPdf: async (req, res) => {
            try {
                const {
                    reportData: vehiclesLocationData,
                    dateFilter: { start: startDate, end: endDate },
                    speedFilter: { min: minSpeed, max: maxSpeed },
                } = req.payload;
                const distance = vehicle =>
                    geolib.getPathLength(vehicle.locations) / 1000.0;
                const round = (floatingPoint, fractionDigits = 2) =>
                    parseFloat(floatingPoint).toFixed(fractionDigits);
                const persianDate = dateString =>
                    dateString
                        ? moment(new Date(dateString)).format(
                              'jYYYY/jM/jD HH:mm:ss'
                          )
                        : null;

                const reportContext = {
                    title: 'Locations of Devices',
                    date: new Date(),
                    reporter: req.user,
                    header: `گزارش موقعیت دستگاه‌ها (از ${
                        startDate ? persianDate(startDate) : 'ابتدا'
                    } تا ${endDate ? persianDate(endDate) : 'کنون'})`,
                    startDate,
                    endDate,
                    minSpeed,
                    maxSpeed,
                    vehiclesLocationData,
                    distance,
                    round,
                    persianDate,
                };
                const filePath = await reports.getPdfReport(
                    'devicelocations.jade',
                    reportContext
                );
                return res.file(filePath, {
                    mode: 'attachment',
                    filename: path.basename(filePath),
                });
            } catch (ex) {
                logger.error(ex);
                return res({ msg: ex.message }).code(404);
            }
        },
        reportDeviceAlarms: async (req, res) => {
            try {
                const {
                    dateFilter: { start: startDate, end: endDate },
                    timeFilter: { start: startTime, end: endTime },
                } = req.payload;
                if (
                    startDate &&
                    endDate &&
                    new Date(startDate) > new Date(endDate)
                ) {
                    throw new Error(
                        'تاریخ شروع گزارش نمی‌تواند از تاریخ پایان گزارش جلوتر باشد.'
                    );
                }
                if (startTime && endTime && startTime > endTime) {
                    throw new Error(
                        'ساعت شروع گزارش نمی‌تواند از ساعت پایان گزارش جلوتر باشد.'
                    );
                }
                const { reportDevices } = await reports.getReportDevices(req);
                reportDevices.select({ _id: 1 });
                const deviceIds = (await reportDevices).map(
                    ({ _id: vehicleId }) => vehicleId
                );

                const reportAlarms = VehicleAlarmModel.aggregate()
                    .match({ vehicleId: { $in: deviceIds } })
                    .addFields({
                        dateCreated: {
                            $dateFromString: {
                                dateString: { $substr: ['$date', 0, 34] },
                            },
                        },
                        dateCreatedHour: {
                            $hour: {
                                date: {
                                    $dateFromString: {
                                        dateString: {
                                            $substr: ['$date', 0, 34],
                                        },
                                    },
                                },
                                timezone: 'Asia/Tehran',
                            },
                        },
                    });
                if (startDate) {
                    reportAlarms.match({
                        dateCreated: { $gte: new Date(startDate) },
                    });
                }
                if (endDate) {
                    reportAlarms.match({
                        dateCreated: { $lte: new Date(endDate) },
                    });
                }
                if (startTime) {
                    reportAlarms.match({
                        dateCreatedHour: { $gte: startTime },
                    });
                }
                if (endTime) {
                    reportAlarms.match({
                        dateCreatedHour: { $lt: endTime },
                    });
                }
                const vehiclesAlarmData = await reportAlarms
                    .group({
                        _id: '$vehicleId',
                        alarms: {
                            $push: {
                                date: '$dateCreated',
                                type: '$type',
                                desc: '$desc',
                                hour: '$dateCreatedHour',
                            },
                        },
                    })
                    .lookup({
                        from: 'vehicles',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'device',
                    })
                    .unwind('device')
                    .lookup({
                        from: 'devicegroups',
                        localField: 'device._id',
                        foreignField: 'devices',
                        as: 'device.groups',
                    })
                    .replaceRoot({
                        $mergeObjects: [
                            '$$ROOT',
                            {
                                groups: '$device.groups.name',
                                device: {
                                    IMEI: '$device.deviceIMEI',
                                    type: '$device.type',
                                    simNumber: '$device.simNumber',
                                },
                                driver: {
                                    name: '$device.driverName',
                                    phoneNumber: '$device.driverPhoneNumber',
                                },
                            },
                        ],
                    });

                return res(vehiclesAlarmData).code(200);
            } catch (ex) {
                logger.error(ex);
                return res({ msg: ex.message }).code(404);
            }
        },
        exportDeviceAlarmsReportToPdf: async (req, res) => {
            try {
                const {
                    reportData: vehiclesAlarmData,
                    dateFilter: { start: startDate, end: endDate },
                } = req.payload;
                const round = (floatingPoint, fractionDigits = 2) =>
                    parseFloat(floatingPoint).toFixed(fractionDigits);
                const persianDate = dateString =>
                    dateString
                        ? moment(new Date(dateString)).format(
                              'jYYYY/jM/jD HH:mm:ss'
                          )
                        : null;

                const reportContext = {
                    title: 'Alarms of Devices',
                    date: new Date(),
                    reporter: req.user,
                    header: `گزارش هشدارها (از ${
                        startDate ? persianDate(startDate) : 'ابتدا'
                    } تا ${endDate ? persianDate(endDate) : 'کنون'})`,
                    startDate,
                    endDate,
                    vehiclesAlarmData,
                    round,
                    persianDate,
                };
                const filePath = await reports.getPdfReport(
                    'devicealarms.jade',
                    reportContext
                );
                return res.file(filePath, {
                    mode: 'attachment',
                    filename: path.basename(filePath),
                });
            } catch (ex) {
                logger.error(ex);
                return res({ msg: ex.message }).code(404);
            }
        },

        // ********************************************

        reportDeviceStatus: async (req, res) => {
            try {
                const {
                    dateFilter: { start: startDate, end: endDate },
                } = req.payload;
                if (
                    startDate &&
                    endDate &&
                    new Date(startDate) > new Date(endDate)
                ) {
                    throw new Error(
                        'تاریخ شروع گزارش نمی‌تواند از تاریخ پایان گزارش جلوتر باشد.'
                    );
                }

                const { reportDevices } = await reports.getReportDevices(req);

                reportDevices.select({
                    deviceIMEI: 1,
                    _id: 1,
                });
                const deviceIMEI = (await reportDevices).map(
                    ({ deviceIMEI: vehicleIMEI }) => vehicleIMEI
                );

                VehicleStatusModel.aggregate()
                    .match({
                        $and: [
                            { vehicleIMEI: { $in: deviceIMEI } },
                            {
                                $or: [
                                    { date: { $gte: new Date(startDate) } },
                                    { date: { $lte: new Date(endDate) } },
                                ],
                            },
                        ],
                    })
                    .group({
                        _id: '$vehicleIMEI',
                        status: {
                            $push: {
                                _id: '$_id',
                                date: '$date',
                                status: '$status',
                                desc: '$desc',
                            },
                        },
                    })
                    .lookup({
                        from: 'vehicles',
                        localField: '_id',
                        foreignField: 'deviceIMEI',
                        as: 'device',
                    })
                    .unwind('device')
                    .lookup({
                        from: 'devicegroups',
                        localField: 'device._id',
                        foreignField: 'devices',
                        as: 'device.groups',
                    })
                    .replaceRoot({
                        $mergeObjects: [
                            '$$ROOT',
                            {
                                groups: '$device.groups.name',
                                device: {
                                    IMEI: '$device.deviceIMEI',
                                    type: '$device.type',
                                    simNumber: '$device.simNumber',
                                },
                                driver: {
                                    name: '$device.driverName',
                                    phoneNumber: '$device.driverPhoneNumber',
                                },
                            },
                        ],
                    })
                    .sort({ _id: -1 })
                    .exec(function(error, vehiclesStatusData) {
                        if (error) {
                            logger.error(error);
                        } else {
                            return res(vehiclesStatusData).code(200);
                        }
                    });
            } catch (e) {
                logger.error(e);
                return res({ msg: e.message }).code(404);
            }
        },

        // ********************************************

        exportDeviceStatusReportToPdf: async (req, res) => {
            try {
                const {
                    reportData: vehiclesStatusData,
                    dateFilter: { start: startDate, end: endDate },
                } = req.payload;
                const round = (floatingPoint, fractionDigits = 2) =>
                    parseFloat(floatingPoint).toFixed(fractionDigits);
                const persianDate = dateString =>
                    dateString
                        ? moment(new Date(dateString)).format(
                              'jYYYY/jM/jD HH:mm:ss'
                          )
                        : null;

                const reportContext = {
                    title: 'Statuses of Devices',
                    date: new Date(),
                    reporter: req.user,
                    header: `گزارش وضعیت ها (از ${
                        startDate ? persianDate(startDate) : 'ابتدا'
                    } تا ${endDate ? persianDate(endDate) : 'کنون'})`,
                    startDate,
                    endDate,
                    vehiclesStatusData,
                    round,
                    persianDate,
                };
                const filePath = await reports.getPdfReport(
                    'devicestatuses.jade',
                    reportContext
                );
                return res.file(filePath, {
                    mode: 'attachment',
                    filename: path.basename(filePath),
                });
            } catch (ex) {
                logger.error(ex);
                return res({ msg: ex.message }).code(404);
            }
        },

        // ********************************************

        reportDeviceChanges: async (req, res) => {
            try {
                const {
                    dateFilter: { start: startDate, end: endDate },
                } = req.payload;
                if (
                    startDate &&
                    endDate &&
                    new Date(startDate) > new Date(endDate)
                ) {
                    throw new Error(
                        'تاریخ شروع گزارش نمی‌تواند از تاریخ پایان گزارش جلوتر باشد.'
                    );
                }

                const { reportDevices } = await reports.getReportDevices(req);

                reportDevices.select({
                    deviceIMEI: 1,
                    _id: 1,
                });
                const deviceId = (await reportDevices).map(
                    ({ _id: vehicleId }) => vehicleId
                );

                ActionEventModel.aggregate()
                    .match({
                        $and: [
                            { objectId: { $in: deviceId } },
                            {
                                $or: [
                                    { date: { $gte: new Date(startDate) } },
                                    { date: { $lte: new Date(endDate) } },
                                ],
                            },
                        ],
                    })
                    .lookup({
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user',
                    })
                    .unwind('$user')
                    .group({
                        _id: '$objectId',
                        changes: {
                            $push: {
                                _id: '$_id',
                                user: '$user',
                                date: '$date',
                                objectModel: '$objectModel',
                                objectId: '$objectId',
                                actionType: '$actionType',
                                fieldName: '$fieldName',
                                oldValue: '$oldValue',
                                newValue: '$newValue',
                            },
                        },
                    })
                    .lookup({
                        from: 'vehicles',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'device',
                    })
                    .unwind('device')
                    .lookup({
                        from: 'devicegroups',
                        localField: 'device._id',
                        foreignField: 'devices',
                        as: 'device.groups',
                    })
                    .replaceRoot({
                        $mergeObjects: [
                            '$$ROOT',
                            {
                                groups: '$device.groups.name',
                                device: {
                                    IMEI: '$device.deviceIMEI',
                                    type: '$device.type',
                                    simNumber: '$device.simNumber',
                                },
                                driver: {
                                    name: '$device.driverName',
                                    phoneNumber: '$device.driverPhoneNumber',
                                },
                            },
                        ],
                    })
                    .exec(function(error, vehiclesChangesData) {
                        if (error) {
                            logger.error(error);
                        } else {
                            return res(vehiclesChangesData).code(200);
                        }
                    });
            } catch (e) {
                logger.error(e);
                return res({ msg: e.message }).code(404);
            }
        },

        // ********************************************

        exportDeviceChangesReportToPdf: async (req, res) => {
            try {
                const {
                    reportData: vehiclesChangesData,
                    dateFilter: { start: startDate, end: endDate },
                } = req.payload;
                const round = (floatingPoint, fractionDigits = 2) =>
                    parseFloat(floatingPoint).toFixed(fractionDigits);
                const persianDate = dateString =>
                    dateString
                        ? moment(new Date(dateString)).format(
                              'jYYYY/jM/jD HH:mm:ss'
                          )
                        : null;

                const reportContext = {
                    title: 'تغییرات دستگاه',
                    date: new Date(),
                    reporter: req.user,
                    header: `گزارش تغییرات (از ${
                        startDate ? persianDate(startDate) : 'ابتدا'
                    } تا ${endDate ? persianDate(endDate) : 'کنون'})`,
                    startDate,
                    endDate,
                    vehiclesChangesData,
                    round,
                    persianDate,
                };
                const filePath = await reports.getPdfReport(
                    'devicechanges.jade',
                    reportContext
                );
                return res.file(filePath, {
                    mode: 'attachment',
                    filename: path.basename(filePath),
                });
            } catch (ex) {
                logger.error(ex);
                return res({ msg: ex.message }).code(404);
            }
        },

        // ********************************************

        reportDriverVehicles: async (req, res) => {
            try {
                const {
                    dateFilter: { start: startDate, end: endDate },
                } = req.payload;
                if (
                    startDate &&
                    endDate &&
                    new Date(startDate) > new Date(endDate)
                ) {
                    throw new Error(
                        'تاریخ شروع گزارش نمی‌تواند از تاریخ پایان گزارش جلوتر باشد.'
                    );
                }

                const { reportDevices } = await reports.getReportDevices(req);

                reportDevices.select({
                    deviceIMEI: 1,
                    driverName: 1,
                    _id: 1,
                });
                const driverName = (await reportDevices).map(
                    ({ driverName: driverFullName }) => driverFullName
                );

                ActionEventModel.aggregate([
                    {
                        $match: {
                            $and: [
                                { oldValue: { $in: driverName } },
                                {
                                    $or: [
                                        { date: { $gte: new Date(startDate) } },
                                        { date: { $lte: new Date(endDate) } },
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        $lookup: {
                            from: 'vehicles',
                            localField: 'objectId',
                            foreignField: '_id',
                            as: 'vehicle',
                        },
                    },
                    { $unwind: '$vehicle' },
                    { $unset: 'vehicle.alarms' },
                    {
                        $lookup: {
                            from: 'devicegroups',
                            localField: 'vehicle._id',
                            foreignField: 'devices',
                            as: 'group',
                        },
                    },
                    { $unwind: '$group' },
                    { $unset: 'group.devices' },
                    { $unset: 'group.sharees' },
                    { $set: { 'vehicle.groups': '$group' } },
                    {
                        $group: {
                            _id: '$oldValue',
                            vehicles: {
                                $push: {
                                    plate: '$vehicle.plate',
                                    date: '$date',
                                    type: '$vehicle.type',
                                    group: '$vehicle.groups.name',
                                },
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: 'vehicles',
                            localField: '_id',
                            foreignField: 'driverName',
                            as: 'currentVehicle',
                        },
                    },

                    { $unwind: '$currentVehicle' },
                    { $unset: 'currentVehicle.alarms' },
                    {
                        $lookup: {
                            from: 'devicegroups',
                            localField: 'currentVehicle._id',
                            foreignField: 'devices',
                            as: 'group',
                        },
                    },
                    { $unwind: '$group' },
                    { $unset: 'group.devices' },
                    { $unset: 'group.sharees' },
                    { $set: { 'currentVehicle.groups': '$group.name' } },
                    { $unset: 'group' },
                ]).exec(function(error, driverVehiclesData) {
                    if (error) {
                        logger.error(error);
                    } else {
                        return res(driverVehiclesData).code(200);
                    }
                });
            } catch (e) {
                logger.error(e);
                return res({ msg: e.message }).code(404);
            }
        },

        exportDriverVehiclesReportToPdf: async (req, res) => {
            try {
                const {
                    reportData: driverVehiclesData,
                    dateFilter: { start: startDate, end: endDate },
                } = req.payload;
                const round = (floatingPoint, fractionDigits = 2) =>
                    parseFloat(floatingPoint).toFixed(fractionDigits);
                const persianDate = dateString =>
                    dateString
                        ? moment(new Date(dateString)).format(
                              'jYYYY/jM/jD HH:mm:ss'
                          )
                        : null;

                const reportContext = {
                    title: 'تغییر ماشین‌ها',
                    date: new Date(),
                    reporter: req.user,
                    header: `گزارش تغییرات (از ${
                        startDate ? persianDate(startDate) : 'ابتدا'
                    } تا ${endDate ? persianDate(endDate) : 'کنون'})`,
                    startDate,
                    endDate,
                    driverVehiclesData,
                    round,
                    persianDate,
                };
                const filePath = await reports.getPdfReport(
                    'driverVehicles.jade',
                    reportContext
                );
                return res.file(filePath, {
                    mode: 'attachment',
                    filename: path.basename(filePath),
                });
            } catch (ex) {
                logger.error(ex);
                return res({ msg: ex.message }).code(404);
            }
        },

        // ********************************************
    };

    var helpers = {
        getLocationBasedOnSpeedDate: function(
            IMEI,
            bDate,
            eDate,
            minSpeed,
            maxSpeed,
            callback
        ) {
            try {
                GPSDataModel.find({ IMEI: IMEI }).exec(function(err, data) {
                    if (err) {
                        logger.error(err);
                    } else if (!data) {
                        logger.debug('There is no gps data');
                    } else {
                        var locations = new Array();
                        var result = {
                            data: new Array(),
                            distance: 0,
                            avgSpeed: 0,
                            maxSpeed: 0,
                            minSpeed: 999999,
                            count: 0,
                        };
                        for (var i = 0; i < data.length; i++) {
                            var tmpTS = new Date(data[i].date).getTime();
                            var currentSpeed = parseInt(
                                data[i].speed.toString()
                            );
                            if (tmpTS <= eDate && tmpTS >= bDate)
                                if (
                                    currentSpeed <= maxSpeed &&
                                    currentSpeed >= minSpeed
                                ) {
                                    result.count = result.count + 1;
                                    result.avgSpeed =
                                        result.avgSpeed + currentSpeed;
                                    if (result.minSpeed >= currentSpeed)
                                        result.minSpeed = currentSpeed;
                                    if (result.maxSpeed <= currentSpeed)
                                        result.maxSpeed = currentSpeed;
                                    locations.push({
                                        latitude: data[i].lat,
                                        longitude: data[i].lng,
                                    });
                                    data[i].pDate = moment(
                                        moment(new Date(data[i].date)).format(
                                            'YYYY/MM/DD HH:mm:ss'
                                        ),
                                        'YYYY/MM/DD HH:mm:ss'
                                    ).format('jYYYY/jM/jD HH:mm:ss');
                                    result.data.push(data[i]);
                                }
                        }
                        if (result.count > 0) {
                            result.distance = (
                                geolib.getPathLength(locations) / 1000.0
                            ).toFixed(2);
                            result.avgSpeed = (
                                result.avgSpeed / result.count
                            ).toFixed(2);
                            result.lastLocation =
                                result.data[result.count - 1].address;
                            result.lastLocationDate =
                                result.data[result.count - 1].pDate;
                        }
                        callback && callback(result);
                    }
                });
            } catch (ex) {
                logger.error(ex);
            }
        },
        getPMDistance: function(IMEI, lastIndex, thr, callback) {
            try {
                if (lastIndex) {
                    GPSDataModel.find({
                        $and: [{ IMEI: IMEI }, { _id: { $gt: lastIndex } }],
                    }).exec(function(err, data) {
                        if (err) {
                            logger.error(err);
                        } else if (!data) {
                            logger.debug('There is no gps data');
                        } else {
                            var locations = new Array();
                            for (var i = 0; i < data.length; i++) {
                                locations.push({
                                    latitude: data[i].lat,
                                    longitude: data[i].lng,
                                });
                            }
                            var dist = (
                                geolib.getPathLength(locations) / 1000.0
                            ).toFixed(2);
                            callback && callback(dist);
                        }
                    });
                } else {
                    GPSDataModel.find({ IMEI: IMEI }).exec(function(err, data) {
                        if (err) {
                            logger.error(err);
                        } else if (!data) {
                            logger.debug('There is no gps data');
                        } else {
                            var locations = new Array();
                            for (var i = 0; i < data.length; i++) {
                                locations.push({
                                    latitude: data[i].lat,
                                    longitude: data[i].lng,
                                });
                            }
                            var dist = (
                                geolib.getPathLength(locations) / 1000.0
                            ).toFixed(2);
                            callback && callback(dist);
                        }
                    });
                }
            } catch (ex) {
                logger.error(ex);
            }
        },
    };

    var tests = {
        checkSpeed: function(req, res) {
            try {
                var IMEI = req.params.IMEI;
                var speed = req.params.speed;
                var address = '-----';
                GT06Controller().checkSpeed(speed, IMEI, address);
                return res({ msg: 'ok' }).code(200);
            } catch (ex) {
                return res({
                    msg: ex,
                }).code(404);
            }
        },
    };

    const commands = {
        resetDevice: (req, res) => {
            try {
                const { IMEI } = req.params;
                VehicleModel.findOne({ deviceIMEI: IMEI }).exec(
                    (err, vehicle) => {
                        if (err) {
                            return res({ msg: err }).code(500);
                        }
                        if (!vehicle) {
                            return res({ msg: 'vehicle not found' }).code(404);
                        }
                        if (['GT06', 'MVT380'].includes(vehicle.trackerModel)) {
                            NotifyUtility.resetDevice(
                                vehicle.simNumber,
                                vehicle.trackerModel === 'GT06'
                            ).then(() => {
                                res({ msg: 'OK' }).code(200);
                            });
                        }
                    }
                );
            } catch (ex) {
                return res({ msg: ex }).code(404);
            }
        },
        setInterval: (req, res) => {
            try {
                const { IMEI, interval } = req.params;
                VehicleModel.findOne({ deviceIMEI: IMEI }).exec(
                    (err, vehicle) => {
                        if (err) {
                            return res({ msg: err }).code(500);
                        }
                        if (!vehicle) {
                            return res({ msg: 'vehicle not found' }).code(404);
                        }
                        if (['GT06', 'MVT380'].includes(vehicle.trackerModel)) {
                            NotifyUtility.setInterval(
                                vehicle.simNumber,
                                interval,
                                vehicle.trackerModel === 'GT06'
                            ).then(() => {
                                res({ msg: 'OK' }).code(200);
                            });
                        }
                    }
                );
            } catch (ex) {
                return res({ msg: ex }).code(404);
            }
        },
        setAPN: (req, res) => {
            try {
                const { IMEI, apnname } = req.params;
                VehicleModel.findOne({ deviceIMEI: IMEI }).exec(
                    (err, vehicle) => {
                        if (err) {
                            return res({ msg: err }).code(500);
                        }
                        if (!vehicle) {
                            return res({ msg: 'vehicle not found' }).code(404);
                        }
                        if (['GT06', 'MVT380'].includes(vehicle.trackerModel)) {
                            NotifyUtility.setAPN(
                                vehicle.simNumber,
                                apnname,
                                vehicle.trackerModel === 'GT06'
                            ).then(() => {
                                res({ msg: 'OK' }).code(200);
                            });
                        }
                    }
                );
            } catch (ex) {
                return res({ msg: ex }).code(404);
            }
        },
        setSOS: (req, res) => {
            try {
                const { IMEI, sos } = req.params;
                VehicleModel.findOne({ deviceIMEI: IMEI }).exec(
                    (err, vehicle) => {
                        if (err) {
                            return res({ msg: err }).code(500);
                        }
                        if (!vehicle) {
                            return res({ msg: 'vehicle not found' }).code(404);
                        }
                        if (vehicle.trackerModel === 'GT06') {
                            NotifyUtility.setSOSNumber(
                                vehicle.simNumber,
                                sos
                            ).then(() => {
                                res({ msg: 'OK' }).code(200);
                            });
                        } else if (vehicle.trackerModel === 'MVT380') {
                            res({ msg: 'Not Implemented' }).code(404);
                        }
                    }
                );
            } catch (ex) {
                return res({ msg: ex }).code(404);
            }
        },
        configure: (req, res) => {
            try {
                const { IMEI } = req.params;
                VehicleModel.findOne({ deviceIMEI: IMEI }).exec(
                    (err, vehicle) => {
                        if (err) {
                            return res({ msg: err }).code(500);
                        }
                        if (!vehicle) {
                            return res({ msg: 'vehicle not found' }).code(404);
                        }
                        if (vehicle.trackerModel === 'GT06') {
                            NotifyUtility.setServerAutomatic(
                                vehicle.simNumber
                            ).then(() => {
                                res({ msg: 'OK' }).code(200);
                            });
                        } else if (vehicle.trackerModel === 'MVT380') {
                            NotifyUtility.reconfigureDevice(
                                vehicle.simNumber
                            ).then(() => {
                                res({ msg: 'OK' }).code(200);
                            });
                        }
                    }
                );
            } catch (ex) {
                return res({ msg: ex }).code(404);
            }
        },
    };

    var alarms = {
        getAlarmSettings: function(req, res) {
            try {
                var IMEI = req.params.IMEI;
                var settingsType = req.params.settingsType;
                VehicleModel.findOne({ deviceIMEI: IMEI }).exec(function(
                    err,
                    vehicle
                ) {
                    if (err) {
                        return res({
                            msg: err,
                        }).code(500);
                    } else if (!vehicle) {
                        return res({
                            msg: 'vehicle not found',
                        }).code(404);
                    } else {
                        return res(vehicle.getAlarmSettings(settingsType)).code(
                            200
                        );
                    }
                });
            } catch (ex) {
                return res({
                    msg: ex,
                }).code(404);
            }
        },
        setAlarmSettings: function(req, res) {
            try {
                var IMEI = req.payload.IMEI;
                var sendSMS = req.payload.sendSMS ? req.payload.sendSMS : false;
                var smsNumbers = req.payload.smsNumbers;
                var sendEmail = req.payload.sendEmail
                    ? req.payload.sendEmail
                    : false;
                var emails = req.payload.emails;
                var settingsType = req.payload.settingsType;
                var speedLimit = req.payload.maxSpeed;
                var pmDistance = req.payload.maxPmDistance;
                let phoneNumbers = req.payload.smsReceivers;

                VehicleModel.findOne({ deviceIMEI: IMEI }).exec(async function(
                    err,
                    vehicle
                ) {
                    if (err) {
                        return res({
                            msg: err,
                        }).code(500);
                    } else if (!vehicle) {
                        return res({
                            msg: 'vehicle not found',
                        }).code(404);
                    } else {
                        let receivers = await PhoneBookModel.find({
                            phoneNumber: { $in: [...new Set(phoneNumbers)] },
                        });
                        var setting = {
                            sendSMS:
                                sendSMS.toString() == 'true' ? true : false,
                            rcvSMSNumbers: smsNumbers,
                            sendEmail:
                                sendEmail.toString() == 'true' ? true : false,
                            rcvEmails: emails,
                            smsReceivers: receivers,
                        };

                        if (settingsType.toString().toLowerCase() === 'speed') {
                            vehicle
                                .update(
                                    { speedAlarm: setting },
                                    { upsert: true }
                                )
                                .exec();
                            vehicle.maxSpeed = isNaN(speedLimit)
                                ? vehicle.maxSpeed
                                : speedLimit;
                        }
                        if (settingsType.toString().toLowerCase() === 'pm') {
                            vehicle.pmAlarm.sendEmail = setting.sendEmail;
                            vehicle.pmAlarm.sendSMS = setting.sendSMS;
                            vehicle.pmAlarm.rcvEmails = setting.rcvEmails;
                            vehicle.pmAlarm.rcvSMSNumbers =
                                setting.rcvSMSNumbers;
                            vehicle.maxPMDistance = isNaN(pmDistance)
                                ? vehicle.maxPMDistance
                                : pmDistance;
                        }
                        if (
                            settingsType.toString().toLowerCase() === 'region'
                        ) {
                            vehicle.regionAlarm.sendEmail = setting.sendEmail;
                            vehicle.regionAlarm.sendSMS = setting.sendSMS;
                            vehicle.regionAlarm.rcvEmails = setting.rcvEmails;
                            vehicle.regionAlarm.rcvSMSNumbers =
                                setting.rcvSMSNumbers;
                        }

                        vehicle.save(function(err) {
                            if (err) {
                                return res({
                                    msg: err,
                                }).code(404);
                            } else {
                                return res(
                                    vehicle.getAlarmSettings(settingsType)
                                ).code(200);
                            }
                        });
                    }
                });
            } catch (ex) {
                return res({
                    msg: ex,
                }).code(404);
            }
        },
    };

    function getBachInfoViaIMEI(req, res) {
        try {
            var requiredFields = ['IMEIs'];
            var arrayOfIMEIS = new Array();
            for (var i = 0; i < requiredFields.length; i++) {
                if (requiredFields[i] in req.payload == false) {
                    return res({
                        msg: requiredFields[i] + " doesn't exist",
                        code: '400',
                        validate: false,
                        field: requiredFields[i],
                    }).code(400);
                }
            }

            for (var i = 0; i < req.payload.IMEIs.length; i++) {
                arrayOfIMEIS.push({ deviceIMEI: req.payload.IMEIs[i] });
            }

            var condition = { $or: arrayOfIMEIS };

            VehicleModel.find(condition).exec(function(err, vehicles) {
                if (err) {
                    return res({
                        msg: err,
                    }).code(500);
                } else {
                    return res({
                        msg: 'fetched successfully',
                        vehicles: vehicles,
                        code: 200,
                    }).code(200);
                }
            });
        } catch (ex) {
            logger.error(ex);
            return res({
                msg: ex,
            }).code(500);
        }
    }

    function getDevicesOfGroup(req, res) {
        try {
        } catch (ex) {}
    }

    // *************************************

    async function setPolygon(req, res) {
        var id = req.payload.id;
        var Polygon = req.payload.coordinates;
        var createDate = new Date().AsDateJs();
        var creator = req.user._id;
        var sendSMS = req.payload.sendSMS ? req.payload.sendSMS : false;
        var smsNumbers = req.payload.smsNumbers;
        var smsReceivers = req.payload.smsReceivers;
        var sendEmail = req.payload.sendEmail ? req.payload.sendEmail : false;
        var emails = req.payload.emails;
        var smsInterval = req.payload.smsInterval || 3;

        let receivers = await PhoneBookModel.find({
            phoneNumber: { $in: [...new Set(smsReceivers)] },
        });
        var alarmSetting = {
            sendSMS: sendSMS.toString() === 'true',
            rcvSMSNumbers: smsNumbers,
            smsReceivers: receivers,
            sendEmail: sendEmail.toString() === 'true',
            rcvEmails: emails,
        };

        var zoneSetting = {
            createDate: createDate,
            creator: creator,
            coordinates: Polygon,
            alarmInterval: smsInterval,
        };

        if (!id) {
            return res({
                msg: 'id required',
                code: '422',
                validate: false,
                field: 'vehicleIMEI',
            }).code(422);
        } else {
            VehicleModel.findOneAndUpdate(
                { _id: id },
                {
                    zoneAlarm: alarmSetting,
                    permissibleZone: zoneSetting,
                },
                { upsert: true, new: true },
                (error, vehicle) => {
                    if (error) {
                        return res({
                            msg: error,
                        }).code(500);
                    } else if (!vehicle) {
                        return res({
                            msg: 'vehicle not found',
                        }).code(404);
                    } else {
                        return res(vehicle).code(200);
                    }
                }
            );
        }
    }

    // *************************************

    function deletePolygon(req, res) {
        var deviceId = req.params.id;
        if (!deviceId) {
            return res({
                msg: 'id required',
                code: '422',
                validate: false,
                field: 'vehicleIMEI',
            }).code(422);
        } else {
            VehicleModel.updateOne(
                { _id: deviceId },
                { $unset: { permissibleZone: 1 } }
            ).exec(function(err, result) {
                if (err) {
                    return res({
                        msg: err,
                    }).code(500);
                } else {
                    return res().code(200);
                }
            });
        }
    }

    // *************************************

    function getDeviceInfo(req, res) {
        var deviceId = req.params.id;
        if (!deviceId) {
            return res({
                msg: 'id required',
                code: '422',
                validate: false,
                field: 'vehicleIMEI',
            }).code(422);
        } else {
            VehicleModel.findOne({ _id: deviceId })
                .populate('lastLocation')
                .populate('vehicleStatus')
                .sort({ _id: -1 })
                .exec(function(err, vehicle) {
                    if (err) {
                        return res({
                            msg: err,
                        }).code(500);
                    } else {
                        return res(vehicle).code(200);
                    }
                });
        }
    }

    // *************************************

    async function updateLocationManually(req, res) {
        let trackerModel = req.payload.trackerModel;
        let message;
        let receiver = req.payload.simNumber;
        let data;
        try {
            if (trackerModel.includes('FM')) {
                message = '  ggps';
            } else if (trackerModel.includes('GT')) {
                message = 'URL#';
            } else if (trackerModel.includes('MVT')) {
                message = '3641,A00';
            }
            data = await GPSController.GPSController.sendLocationSMS(
                message,
                receiver
            );
        } catch (e) {
            logger.error(e);
            data = 'مجددا تلاش کنید';
        }
        return res({ data: data }).code(200);
    }

    // *************************************

    async function setDeviceStatus(req, res) {
        let status = req.payload.status;
        let imei = req.payload.imei;
        let desc = req.payload.desc;
        let createDate = new Date().AsDateJs();

        if (!imei) {
            return res({
                msg: 'IMEI required',
                code: '422',
                validate: false,
                field: 'deviceIMEI',
            }).code(422);
        } else if (!status) {
            return res({
                msg: 'status required',
                code: '422',
                validate: false,
                field: 'vehicleStatus',
            }).code(422);
        }
        {
            VehicleModel.findOne({ deviceIMEI: imei })
                .populate('vehicleStatus')
                // .lean()
                .exec(async function(error, vehicle) {
                    if (error) {
                        return res({
                            msg: error,
                        }).code(500);
                    } else if (!vehicle) {
                        return res({
                            msg: 'vehicle not found',
                        }).code(404);
                    } else {
                        // create new vehicleStatusModel
                        if (vehicle.vehicleStatus.status !== status) {
                            let vehicleStatus = new VehicleStatusModel({
                                vehicleIMEI: imei,
                                status: status,
                                date: createDate,
                                desc: desc,
                            });

                            await vehicleStatus.save();

                            await vehicle
                                .update(
                                    {
                                        vehicleStatus: vehicleStatus._id,
                                    },
                                    { upsert: true }
                                )
                                .exec();
                            await vehicle.save();

                            return res().code(200);
                        } else if (vehicle.vehicleStatus.status === status) {
                            // update desc
                            let id = vehicle.vehicleStatus._id;
                            VehicleStatusModel.findOneAndUpdate(
                                { _id: id },
                                { desc: desc }
                            ).exec(function(err, result) {
                                if (err) {
                                    logger.error(err);
                                } else {
                                    return res().code(200);
                                }
                            });
                        }
                    }
                });
        }
    }

    // *************************************

    async function deleteDeviceStatus(req, res) {
        var deviceId = req.params.id;
        if (!deviceId) {
            return res({
                msg: 'id required',
                code: '422',
                validate: false,
                field: 'vehicleId',
            }).code(422);
        } else {
            VehicleModel.findOne({ _id: deviceId })
                .populate('lastLocation')
                .exec(async function(err, vehicle) {
                    if (err) {
                        return res({
                            msg: err,
                        }).code(500);
                    } else {
                        let status = '';
                        let now = new Date().AsDateJs();
                        if (!vehicle.vehicleStatus) {
                            return res({
                                msg: err,
                            }).code(500);
                        } else if (!vehicle.lastLocation) {
                            status = 'بدون داده';
                        } else {
                            let lastLocationDate = vehicle.lastLocation.date;
                            let diffDays = Math.floor(
                                (now - lastLocationDate) / (1000 * 60 * 60 * 24)
                            );
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

                        let vehicleStatus = new VehicleStatusModel({
                            vehicleIMEI: vehicle.deviceIMEI,
                            status: status,
                            date: new Date().AsDateJs(),
                            desc: 'بازگشت به کار',
                        });
                        await vehicleStatus.save();

                        vehicle.vehicleStatus = vehicleStatus._id;
                        await vehicle.save();

                        return res().code(200);
                    }
                });
        }
    }

    // *************************************

    async function getDeviceModels(req, res) {
        try {
            VehicleTypeModel.find()
                .select({ name: 1, _id: 0 })
                .exec((err, vehicleModels) => {
                    if (err) {
                        logger.error(err);
                        return res({
                            msg: err,
                        }).code(500);
                    }
                    if (!vehicleModels) {
                        return res({
                            msg: 'There is no vehicle model',
                        }).code(404);
                    }
                    return res(vehicleModels).code(200);
                });
        } catch (ex) {
            logger.error(ex);
            return res({
                msg: ex,
            }).code(404);
        }
    }

    // *************************************

    async function addDeviceModels(req, res) {
        try {
            const name = req.payload.vehicleType;
            const typeExist = await VehicleTypeModel.exists({ name });
            if (typeExist) {
                return res({
                    msg: 'این مدل قبلا در سامانه ثبت گردیده است',
                }).code(400);
            }
            const vehicleType = new VehicleTypeModel({ name });
            await vehicleType.save();
            return res(vehicleType).code(200);
        } catch (ex) {
            logger.error(ex);
            return res({
                msg: ex,
            }).code(404);
        }
    }

    return {
        getDevices: getDevices,
        getDevicesOfGroup: getDevicesOfGroup,
        addDevice: addDevice,
        editDevice: editDevice,
        getDeviceByIMEI: getDeviceByIMEI,
        getDeviceGroups: getDeviceGroups,
        getDeviceAlarm: getDeviceAlarm,
        deleteDevice: deleteDevice,
        getLastLocationsOfDeviceInP: getLastLocationsOfDeviceInP,
        getLastLocationOfAllDevice: getLastLocationOfAllDevice,
        refreshDeviceLocations: refreshDeviceLocations,
        getBachInfoViaIMEI: getBachInfoViaIMEI,
        setPolygon: setPolygon,
        deletePolygon: deletePolygon,
        getDeviceInfo: getDeviceInfo,
        updateLocationManually: updateLocationManually,
        setDeviceStatus: setDeviceStatus,
        deleteDeviceStatus: deleteDeviceStatus,
        getDeviceModels: getDeviceModels,
        addDeviceModels: addDeviceModels,

        reports: {
            reportDeviceLocations: reports.reportDeviceLocations,
            exportDeviceLocationsReportToPdf:
                reports.exportDeviceLocationsReportToPdf,
            reportDeviceAlarms: reports.reportDeviceAlarms,
            exportDeviceAlarmsReportToPdf:
                reports.exportDeviceAlarmsReportToPdf,
            reportDeviceStatus: reports.reportDeviceStatus,
            exportDeviceStatusReportToPdf:
                reports.exportDeviceStatusReportToPdf,

            reportDeviceChanges: reports.reportDeviceChanges,
            exportDeviceChangesReportToPdf:
                reports.exportDeviceChangesReportToPdf,

            reportDriverVehicles: reports.reportDriverVehicles,
            exportDriverVehiclesReportToPdf:
                reports.exportDriverVehiclesReportToPdf,
        },
        alarms: {
            getAlarmSettings: alarms.getAlarmSettings,
            setAlarmSettings: alarms.setAlarmSettings,
        },
        helpers: {
            getPMDistance: helpers.getPMDistance,
            getLocationBasedOnSpeedDate: helpers.getLocationBasedOnSpeedDate,
        },
        commands: {
            resetDevice: commands.resetDevice,
            setInterval: commands.setInterval,
            setAPN: commands.setAPN,
            setSOS: commands.setSOS,
            configure: commands.configure,
        },
        tests: {
            checkSpeed: tests.checkSpeed,
            // checkZone: tests.checkZone
        },
    };
}

module.exports.DeviceController = DeviceController;
