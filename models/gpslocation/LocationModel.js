const mongoose = require('mongoose');

const { Schema } = mongoose;

const LocationSchema = new Schema({
    creationDate: { type: Date, default: Date.now },
    geo: { type: [Number], index: '2d' },
    address: { type: String },
});

const LocationModel = mongoose.model('location', LocationSchema);

module.exports = LocationModel;
