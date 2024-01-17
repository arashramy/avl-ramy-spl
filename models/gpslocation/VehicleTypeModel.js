const mongoose = require('mongoose');

const { Schema } = mongoose;

const VehicleTypeSchema = new Schema({
    creationDate: { type: Date, default: Date.now },
    name: { type: String },
});

const VehicleTypeModel = mongoose.model('vehicletype', VehicleTypeSchema);

module.exports = VehicleTypeModel;
