const mongoose = require('mongoose');

const { Schema } = mongoose;

const PhoneBookSchema = new Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: false },
    dateCreated: { type: Date, default: Date.now },
});

const PhoneBookModel = mongoose.model('phoneBook', PhoneBookSchema);

module.exports = PhoneBookModel;
