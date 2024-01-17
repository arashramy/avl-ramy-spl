const mongoose = require('mongoose');

const { Schema } = mongoose;

const TokenSchema = new Schema({
    userId: { type: Schema.ObjectId, ref: 'users', required: true },
    token: { type: String, required: true },
    exp: { type: String, required: true },
    state: { type: Boolean, default: true },
    created: { type: Date, default: Date.now },
    deleted: { type: Date, default: Date.now },
});

const TokenModel = mongoose.model('tokens', TokenSchema);

module.exports = TokenModel;
