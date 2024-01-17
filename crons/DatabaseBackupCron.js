const path = require('path');
const moment = require('moment');
const cron = require('node-cron');
const { promises: fs } = require('fs');
const { execSync: exec } = require('child_process');

const { log } = require('debug');
const { db } = require('../database');
const { logger } = require('../utility/customlog.js');
const { GPSDataModel, VehicleModel } = require('../models/gpslocation');

const backupOptions = {
    removeOldBackups: true,
    latestMonthlyBackupsToKeep: 2,
    latestWeeklyBackupsToKeep: 4,
    backupDir: path.resolve(__dirname, '..', '..', 'db-backups'),
};

class DatabaseBackupCron {
    static async removeOldGPSData(expirationDate) {
        //  ------- delete gps data for before 9 months ago -------
        try {
            const vehicleLastLocations = (
                await VehicleModel.find().select('lastLocation')
            ).map(item => item.lastLocation);
            const oldGPSDataQuery = await GPSDataModel.deleteMany({
                _id: { $nin: vehicleLastLocations },
                date: { $lte: expirationDate },
            });

            logger.info(
                `${oldGPSDataQuery.deletedCount} instances of ${
                    GPSDataModel.modelName
                } created before ${expirationDate} has been deleted on ${new Date()}`
            );
        } catch (error) {
            logger.warn(
                `An error occurred while deleting ${
                    GPSDataModel.modelName
                } instances created before ${expirationDate} on ${new Date()}`
            );
        }
    }

    static async removeOldData() {
        // this method set expiration Date for delete GPS data and call removeOldGPSData method
        const timePoint = new Date();
        timePoint.setHours(0, 0, 0);
        timePoint.setMonth(new Date().getMonth() - 9, 1); // Last 9 Month
        await DatabaseBackupCron.removeOldGPSData(timePoint).catch(logger.warn);
    }

    static async removeOldDatabaseBackups() {
        // ------- delete old backups -------
        const {
            latestMonthlyBackupsToKeep,
            latestWeeklyBackupsToKeep,
            backupDir,
        } = backupOptions;
        const oldBackups = await fs.readdir(backupDir);
        let lastBackupDate;
        const toBeRemovedBackups = oldBackups
            .sort()
            .reverse()
            .filter(backup => {
                const dateMatch = backup.match(/(?<date>\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                    const backupDate = new Date(dateMatch.groups.date);
                    if (!lastBackupDate) {
                        lastBackupDate = backupDate;
                    }
                    const backupAge = moment.duration(
                        lastBackupDate - backupDate
                    );
                    const WeeklyBackupLifeDuration = moment.duration(
                        latestWeeklyBackupsToKeep,
                        'weeks'
                    );
                    const monthlyBackupLifeDuration = moment.duration(
                        latestMonthlyBackupsToKeep,
                        'months'
                    );
                    return !(
                        backupAge < WeeklyBackupLifeDuration ||
                        (backupAge < monthlyBackupLifeDuration &&
                            backupDate.getDate() <= 7)
                    );
                }
                return false;
            });
        toBeRemovedBackups.forEach(fileName => {
            // The fs.unlink() method is used to remove a file or symbolic link from the filesystem.
            fs.unlink(path.resolve(backupDir, fileName)).catch(e =>
                logger.error(e)
            );
        });
    }

    static async backupDatabase() {
        const today = new Date();
        const { backupDir } = backupOptions;
        const backupName = moment(today).format('YYYY-MM-DD');
        const backupPath = path.resolve(backupDir, backupName);
        const databases = db.base.connections.map(
            connection => connection.name
        );
        const commands = databases
            .map(
                database =>
                    `mongodump --host ${db.host} --port ${db.port} --db ${database} --out ${backupPath}`
            )
            .concat([
                `tar cfj ${backupPath}.tar.bz2 -C ${backupPath} ../${backupName}`,
                `rm -r ${backupPath}`,
            ]);
        try {
            await exec(commands.join(' && '));
            logger.info('Database backup file generated successfully.', {
                date: today,
            });
        } catch (error) {
            logger.error(error);
        }
    }

    static run() {
        const EVERY_WEEK_ON_FRIDAY_3_AM = '0 3 * * 4'; // 3 AM every week on Thursday
        cron.schedule(EVERY_WEEK_ON_FRIDAY_3_AM, () => {
            DatabaseBackupCron.removeOldData().then(() => {
                DatabaseBackupCron.backupDatabase().then(() => {
                    const { removeOldBackups } = backupOptions;
                    if (removeOldBackups) {
                        DatabaseBackupCron.removeOldDatabaseBackups().catch(e =>
                            logger.error(e)
                        );
                    }
                });
            });
        });
    }
}

module.exports = { DatabaseBackupCron };
