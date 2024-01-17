const mongoose = require('mongoose');

const { Schema } = mongoose;

const VehicleStatus = new Schema({
    vehicleIMEI: { type: String },
    status: { type: String },
    date: { type: Date },
    desc: { type: String },
});

const VehicleStatusModel = mongoose.model('vehiclestatus', VehicleStatus);

module.exports = VehicleStatusModel;
