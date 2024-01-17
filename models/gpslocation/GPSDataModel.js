const mongoose = require('mongoose');

const VehicleModel = require('./VehicleModel');
const { logger } = require('../../utility/customlog');

const { Schema } = mongoose;

const GPSSchema = new Schema({
    protocolId: { type: String },
    vehicleId: {
        type: Schema.ObjectId,
        ref: 'vehicle',
    },
    deviceName: { type: String },
    date: { type: Date },
    IMEI: { type: String },
    type: { type: String },
    lat: { type: Number },
    lng: { type: Number },
    speed: { type: Number },
    sat: { type: Number },
    fuelConnection: { type: String },
    GPSTracking: { type: String },
    alarm: { type: String },
    voltage: { type: String },
    signalStrength: { type: String },
    url: { type: String },
    address: { type: String },
    raw: { type: Buffer },
});

GPSSchema.index({ vehicleId: 1 });

GPSSchema.post('save', async gpsData => {
    const vehicle = await VehicleModel.findOne({
        deviceIMEI: gpsData.IMEI,
    }).select('_id');
    if (vehicle) {
        vehicle.lastLocation = gpsData.id;
        vehicle.gpsDataCount = await mongoose.model('gpsdata').countDocuments({
            IMEI: gpsData.IMEI,
        });
        await vehicle.save();
    } else {
        logger.error(
            `no vehicle found with IMEI ${gpsData.IMEI} for update last location`
        );
    }
});

const GPSDataModel = mongoose.model('gpsdata', GPSSchema);

module.exports = GPSDataModel;
