const mongoose = require('mongoose');

const { Schema } = mongoose;

const VehicleAlarm = new Schema({
    type: { type: String },
    date: { type: String },
    vehicleId: { type: Schema.ObjectId, ref: 'vehicle' },
    desc: { type: String },
});

const VehicleAlarmModel = mongoose.model('vehiclealarm', VehicleAlarm);

module.exports = VehicleAlarmModel;
