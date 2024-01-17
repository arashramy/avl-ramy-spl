const mongoose = require('mongoose');
const dataTables = require('mongoose-datatables');

const { UserModel } = require('../user');
const { VehicleModel } = require('../gpslocation');

const { Schema } = mongoose;

const DeviceGroupSchema = new Schema({
    user: { type: Schema.ObjectId, ref: UserModel },
    name: { type: String },
    createDate: { type: String },
    desc: { type: String },
    devices: [{ type: Schema.ObjectId, ref: VehicleModel }],
    status: { type: Boolean },
    sharees: [{ type: Schema.ObjectId, ref: UserModel }],
    color: { type: String },
});

DeviceGroupSchema.plugin(dataTables);

const DeviceGroupModel = mongoose.model('devicegroup', DeviceGroupSchema);

module.exports = DeviceGroupModel;
