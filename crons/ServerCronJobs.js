// const { DatabaseBackupCron } = require('./DatabaseBackupCron');
// const { DeviceStatusCron } = require('./SetDeviceStatusCron');
// const { DeviceMonthlyDistanceCron } = require('./calculateCurrentMonthDistanceOfVehicle');
const { DeviceCheckLastLocationDelayCron } = require('./sendSmsForDelayedVehicles')

class ServerCronJobs {
    static run() {
        // DatabaseBackupCron.run();
        // DeviceStatusCron.run();
        // DeviceMonthlyDistanceCron.run();
        DeviceCheckLastLocationDelayCron.run();
    }
}

module.exports = ServerCronJobs;
