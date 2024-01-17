const mongoose = require('mongoose');

const { Schema } = mongoose;

const PMCheckPoints = new Schema({
    date: { type: String },
    user: {
        type: Schema.ObjectId,
        ref: 'users',
    },
    locationIndex: {
        type: Schema.ObjectId,
        ref: 'gpsdata',
    },
    distance: { type: String },
    desc: { type: String },
});

const AlarmSettingSchema = new Schema({
    sendSMS: {
        type: Boolean,
        default: true,
    }, 
    sendEmail: {
        type: Boolean,
        default: true,
    },
    rcvSMSNumbers: { type: String },
    rcvEmails: { type: String },
    smsReceivers: [
        {
            type: Schema.ObjectId,
            ref: 'phoneBook',
        },
    ],
});

const PermissibleZone = new Schema({
    createDate: { type: String },
    creator: {
        type: Schema.ObjectId,
        ref: 'users',
    },
    coordinates: [[Number, Number]],
    alarmInterval: { type: String },
    _id: false,
});

const VehicleSchema = new Schema({
    simNumber: { type: String },
    deviceIMEI: {
        type: String,
        unique: true,
    },
    status: { type: Boolean },
    createDate: { type: String },
    creator: {
        type: Schema.ObjectId,
        ref: 'users',
    },
    gpsDataCount: { type: Number },
    vehicleName: { type: String },
    plate: { type: String },
    type: { type: String },
    driverName: { type: String },
    driverPhoneNumber: { type: String },
    maxSpeed: {
        type: String,
        default: '120',
    },
    lastPMIndex: {
        type: Schema.ObjectId,
        ref: 'gpsdata',
    },
    maxPMDistance: {
        type: String,
        default: '50000',
    },
    alarms: [
        {
            type: Schema.ObjectId,
            ref: 'vehiclealarm',
        },
    ],
    pmCheckPoints: [PMCheckPoints],
    deleteId: {
        type: Schema.ObjectId,
        ref: 'vehicle',
    },
    trackerModel: {
        type: String,
        default: 'GT06',
    },
    lastLocation: {
        type: Schema.ObjectId,
        ref: 'gpsdata',
    },
    speedAlarm: AlarmSettingSchema,
    pmAlarm: AlarmSettingSchema,
    regionAlarm: AlarmSettingSchema,
    zoneAlarm: AlarmSettingSchema,
    GPSSettings: {
        APN: {
            type: String,
            default: 'mtnirancell',
        },
        interval: {
            type: String,
            default: '10',
        },
        sos: {
            type: String,
            default: '09128995907',
        },
    },
    permissibleZone: PermissibleZone,
    zoneStatus: {
        type: String,
        default: 'IN',
    },
    vehicleStatus: {
        type: Schema.ObjectId,
        ref: 'vehiclestatus',
    },
    fuel: { type: Number },
    currentMonthDistance: { type: Number },
    usage: { type: String },
    model: {
        type: Schema.ObjectId,
        ref: 'vehicletype',
    },
});

VehicleSchema.virtual('groups', {
    ref: 'devicegroup',
    localField: '_id',
    foreignField: 'devices',
});

VehicleSchema.methods.getAlarmSettings = function() {
    const {
        _id,
        speedAlarm,
        pmAlarm,
        regionAlarm,
        maxSpeed,
        maxPMDistance,
    } = this;
    return {
        _id,
        speedAlarm,
        pmAlarm,
        regionAlarm,
        maxSpeed,
        maxPMDistance,
    };
};

VehicleSchema.methods.getGPSSettings = function() {
    const { _id, GPSSettings } = this;
    return {
        _id,
        GPSSettings,
    };
};

VehicleSchema.post('remove', async vehicle => {
    await vehicle.populate('groups');
    vehicle.groups
        .filter(group => group)
        .forEach(group => {
            const devices = group.devices.filter(
                deviceId => deviceId !== vehicle.id
            );
            mongoose
                .model('devicegroup')
                .findById(group.id)
                .updateOne({ devices })
                .exec();
        });
});

VehicleSchema.pre('find', async function getUserAuthenticatedDevices() {
    if (this.authUser && !this.authUser.isAdmin()) {
        const { _id: userId, deviceModel } = this.authUser;
        const [userResult] = await mongoose.model('devicegroup').aggregate([
            {
                $match: {
                    $or: [{ user: userId }, { sharees: userId }],
                },
            },
            { $unwind: '$devices' },
            {
                $group: {
                    _id: null,
                    devices: { $addToSet: '$devices' },
                },
            },
        ]);
        if (!userResult) return this.find({ _id: null });
        if (deviceModel.length > 0) {
            this.find({
                $and: [
                    { _id: { $in: userResult.devices } },
                    {
                        model: { $in: deviceModel },
                    },
                ],
            });
        } else {
            this.find({ _id: { $in: userResult.devices } });
        }
    }
});

mongoose.Query.prototype.setAuthorizationUser = function setAuthorizationUser(
    user
) {
    this.authUser = user;
    return this;
};

const VehicleModel = mongoose.model('vehicle', VehicleSchema);

module.exports = VehicleModel;
