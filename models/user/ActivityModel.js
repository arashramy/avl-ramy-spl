const mongoose = require('mongoose');

const { Schema } = mongoose;

const UserActivitySchema = new Schema({
    activityname: { type: String, required: true },
    activitydate: Date,
    activitydesc: String,
    userId: { type: Schema.ObjectId, ref: 'users' },
});

const ActivityModel = mongoose.model('activities', UserActivitySchema);

module.exports = ActivityModel;
