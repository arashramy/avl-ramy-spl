/* eslint-disable */

const mongoose = require('mongoose');
require('../database');
const {
    VehicleModel,
    GPSDataModel
} = require('../models/gpslocation');
const { DeviceGroupModel } = require('../models/devicegroup');

async function run() {
    // remove redundant groups
    const data = [
        {IMEI: '357454075172492', group: 'Kavian Float Glass'},
        {IMEI: '357454075099133', group: 'Kavian Float Glass'},
        {IMEI: '861074020123439', group: 'Kavian Float Glass'},
        {IMEI: '0864717002639098', group: 'کاوه سیلیس - قدیمی'},
        {IMEI: '359231037716709', group: 'حمل مواد  کاوه سودا'},
        {IMEI: '359231037731674', group: 'Kavian Float Glass'},
        {IMEI: '358899053498872', group: 'بلور کاوه - قدیمی'},
        {IMEI: '358899053498872', group: 'Kavian Float Glass'},
        {IMEI: '0358899053508449', group: 'Kavian Float Glass'},
        {IMEI: '357454074871110', group: 'بلور کاوه - قدیمی'},
        {IMEI: '359231037752266', group: 'بلور کاوه - قدیمی'},
        {IMEI: '359231037731740', group: 'بلور کاوه - قدیمی'},
        {IMEI: '0864717002644437', group: 'بلور کاوه - قدیمی'},
        {IMEI: '359231037750534', group: 'حمل مواد  کاوه سودا'},
        {IMEI: '0864717002638942', group: 'حمل مواد  کاوه سودا'},
        {IMEI: '0864717002638942', group: 'Kavian Float Glass'},
        {IMEI: '359231037742275', group: 'Kavian Float Glass'},
        {IMEI: '359231037742275', group: 'کاوه سیلیس - قدیمی'},
        {IMEI: '0864717002644726', group: 'کاوه سیلیس - قدیمی'},
        {IMEI: '0864717002641508', group: 'کاوه سیلیس - قدیمی'},
        {IMEI: '0864717002641508', group: 'Kavian Float Glass'},
        {IMEI: '0864717002630170', group: 'بلور کاوه - قدیمی'},
        {IMEI: '359633105228667', group: 'تست'},
        {IMEI: '359633105228733', group: 'تست'},
        {IMEI: '0864717002644908', group: 'بلور کاوه - قدیمی'},
        {IMEI: '0358899053520832', group: 'بلور کاوه - قدیمی'},
        {IMEI: '0864717002634560', group: 'کاوه سیلیس - قدیمی'},
    ]

    for (let i=0; i< data.length; i++){
        VehicleModel.findOne({deviceIMEI: data[i].IMEI}, {'_id': 1}).exec(function (error, vehicle) {
            DeviceGroupModel.findOne({name: data[i].group}, {'_id': 1}).exec(function (err, group) {
                DeviceGroupModel.update({_id: group._id}, { $pull: { devices: vehicle._id } }).exec(function (er, deleted) {
                    console.log(deleted);
                    console.log('delete finished! Check Database');
                })
            })
        })
    }

    // ----------- for Kaveh Soda -----------
    let moveData = [
        { vehicleId: '5fb22ef8d61a492f96dfc5fa', newGroupName: 'اسقاطی'}, // for IMEI : 359633105023506
        { vehicleId: '5795fc6b32c7992c639f4dd1', newGroupName: 'اسقاطی'}, // for IMEI: 0864717002644908
        { vehicleId: '57de975e3d25d0d06fc0cf0c', newGroupName: 'اسقاطی'}, // for IMEI: 0358899053520832
        { vehicleId: '577a460dab5829d941f0030a', newGroupName: 'کاوه سودا'}, // for IMEI: 0864717002629065
        { vehicleId: '57808eb0e1a2e8831b83ed55', newGroupName: 'کاوه سودا'}, // for IMEI: 0864717002629065
        { vehicleId: '57fa3a7e8976b5490b5d250c', newGroupName: 'کاوه سیلیس'}, // for IMEI: 0864717002634560
    ]
    // add to new group
    for (let i=0; i< moveData.length; i++)
    DeviceGroupModel.findOneAndUpdate({
        name: moveData[i].newGroupName,
    }, {
        $push: {
            devices: {
                _id: moveData[i].vehicleId,
            }
        }
    }, function(err, result) {
        if (err) {console.log('error')}
        else {console.log('done')}
    });

    // delete redundant groups from devicegroups
    // let falseGroups = [
    //     { _id: '577bd1d8bfa4dc252eaae032' }, //کاوه سودا - کامیونهای ...
    //     { _id: '57a5d4e34da8596f35b65c6b' }, //کاوه سودا - کامیونهای ...
    //     { _id: '58046afebff25662794b79a2' }, // کاوه سیلیس - قدیمی
    //     { _id: '5843d163564c3b0285749a27' }, // حمل مواد کاوه سودا
    //     { _id: '586ce25ac398f576aaccb431' }, // بلور کاوه - قدیمی
    //     { _id: '5be2b0f32325930645f8bc2d' }, // Kavian Float Glass
    // ]
    // for (let i = 0; i < falseGroups.length; i++) {
    //     await DeviceGroupModel.deleteOne({ _id: falseGroups[i]._id })
    //         .exec(function (error, result) {
    //             if (error) console.log(error);
    //             else {
    //                 console.log('The end');
    //             }
    //
    //         })
    // }
}

run()
    .then(async () => {

    });

