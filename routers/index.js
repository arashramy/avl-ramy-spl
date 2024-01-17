const { UserRouter } = require('./user');
const { GPSDataRouter } = require('./gpslocation');
const { DeviceGroupRouter } = require('./devicegroup');
const { DeviceRouter } = require('./device');
const { UserRamyRouter } = require('./userRamy');


module.exports = {
    DeviceRouter,
    DeviceGroupRouter,
    GPSDataRouter,
    UserRouter,
    UserRamyRouter
};
