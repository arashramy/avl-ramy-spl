const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
require('safe_datejs');

const { Schema } = mongoose;

const UserRole = new Schema({
    rolename: { type: String },
    roledesc: String,
});

const User = new Schema({
    username: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true,
    },
    hashedPassword: { type: String, required: true },
    salt: { type: String, required: true },
    registeredDate: { type: String, default: new Date().AsDateJs() },
    roles: [UserRole],
    deviceModel: [
        {
            type: Schema.ObjectId,
            ref: 'vehicletype',
        },
    ],
    firstname: String,
    lastname: String,
    mobileNumber: String,
    gender: { type: String, enum: ['Female', 'Male', 'Customer', 'Agent'] },
    email: { type: String, unique: true, required: true },
    isapproved: Boolean,
    islockedout: Boolean,
    profileImage: String,
});

User.virtual('groups', {
    ref: 'devicegroup',
    localField: '_id',
    foreignField: 'sharees',
});

User.pre('save', function(next) {
    if (!this.isModified('hashedPassword')) return next();
    bcrypt.genSalt(5, (err, salt) => {
        if (err) return next(err);
        bcrypt.hash(this.hashedPassword, salt, null, (err, hash) => {
            if (err) return next(err);
            this.hashedPassword = hash;
            this.salt = salt;
            next();
        });
    });
});

User.methods.verifyPassword = function(password, callback) {
    bcrypt.compare(password, this.hashedPassword, (err, isMatch) => {
        if (err) return callback(err);
        callback(null, isMatch);
    });
};

User.methods.getBrief = function() {
    const {
        id,
        username,
        email,
        firstname,
        lastname,
        registerDate,
        mobileNumber,
        gender,
        roles,
    } = this;
    return {
        id,
        username,
        email,
        firstname,
        lastname,
        registerDate,
        mobileNumber,
        gender,
        roles,
    };
};

User.methods.isAdmin = function isAdmin() {
    return this.username === 'admin';
};

User.methods.can = function hasRole(roleName) {
    return this.roles.some(({ rolename }) => rolename === roleName);
};

const UserModel = mongoose.model('users', User);

module.exports = UserModel;
