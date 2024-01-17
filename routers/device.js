require('hapi');
const { DeviceController } = require('../controllers/device');

function DeviceRouter() {
    function registerRoutes(server) {
        server.route({
            method: 'GET',
            path: '/device/cmd/reset/{IMEI}',
            config: { auth: 'jwt' },
            handler: DeviceController().commands.resetDevice
        });

        server.route({
            method: 'GET',
            path: '/device/cmd/interval/{IMEI}/{interval}',
            config: { auth: 'jwt' },
            handler: DeviceController().commands.setInterval
        });

        server.route({
            method: 'GET',
            path: '/device/cmd/apn/{IMEI}/{apnname}',
            config: { auth: 'jwt' },
            handler: DeviceController().commands.setAPN
        });

        server.route({
            method: 'GET',
            path: '/device/cmd/sos/{IMEI}/{sos}',
            config: { auth: 'jwt' },
            handler: DeviceController().commands.setSOS
        });

        server.route({
            method: 'GET',
            path: '/device/cmd/config/{IMEI}',
            config: { auth: 'jwt' },
            handler: DeviceController().commands.configure
        });

        server.route({
            method: 'POST',
            path: '/device',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['device_add'] },
                },
            },
            handler: DeviceController().addDevice
        });

        server.route({
            method: 'GET',
            path: '/device',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['device_view'] },
                },
            },
            handler: DeviceController().getDevices,
        });

        server.route({
            method: 'GET',
            path: '/device/last',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['device_view'] },
                },
            },
            handler: DeviceController().getLastLocationOfAllDevice
        });

        server.route({
            method: 'GET',
            path: '/device/refresh/{IMEI}',
            config: { auth: false },
            handler: DeviceController().refreshDeviceLocations
        });

        server.route({
            method: 'GET',
            path: '/device/refresh/last/{IMEI}',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['device_view'] },
                },
            },
            handler: DeviceController().getDeviceByIMEI,
        });

        server.route({
            method: 'PUT',
            path: '/device',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['device_edit', 'gps_edit'] },
                },
            },
            handler: DeviceController().editDevice,
        });

        server.route({
            method: 'GET',
            path: '/device/alarmsettings/{IMEI}/{settingsType}',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['speed_view'] },
                },
            },
            handler: DeviceController().alarms.getAlarmSettings,
        });

        server.route({
            method: 'POST',
            path: '/device/alarmsettings',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['speed_edit'] },
                },
            },
            handler: DeviceController().alarms.setAlarmSettings,
        });

        server.route({
            method: 'DELETE',
            path: '/device/IMEI/{IMEI}',
            config: { auth: false },
            handler: DeviceController().deleteDevice,
        });

        server.route({
            method: 'GET',
            path: '/device/IMEI/{IMEI}',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['device_view'] },
                },
            },
            handler: DeviceController().getDeviceByIMEI,
        });

        server.route({
            method: 'POST',
            path: '/device/lastlocationsinp',
            config: { auth: false },
            handler: DeviceController().getLastLocationsOfDeviceInP
        });

        server.route({
            method: 'POST',
            path: '/device/report/locations',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['report_view'] },
                },
            },
            handler: DeviceController().reports.reportDeviceLocations,
        });

        server.route({
            method: 'POST',
            path: '/device/report/locations/pdf',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['report_view'] },
                },
                payload: {
                    maxBytes: 50 * 1024 * 1024,
                },
            },
            handler: DeviceController().reports
                .exportDeviceLocationsReportToPdf,
        });

        server.route({
            method: 'POST',
            path: '/device/report/alarms',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['report_view'] },
                },
            },
            handler: DeviceController().reports.reportDeviceAlarms,
        });

        server.route({
            method: 'POST',
            path: '/device/report/alarms/pdf',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['report_view'] },
                },
                payload: {
                    maxBytes: 10 * 1024 * 1024,
                },
            },
            handler: DeviceController().reports.exportDeviceAlarmsReportToPdf,
        });

        server.route({
            method: 'POST',
            path: '/device/report/status',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['report_view'] },
                },
            },
            handler: DeviceController().reports.reportDeviceStatus,
        });

        server.route({
            method: 'POST',
            path: '/device/report/status/pdf',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['report_view'] },
                },
                payload: {
                    maxBytes: 10 * 1024 * 1024,
                },
            },
            handler: DeviceController().reports.exportDeviceStatusReportToPdf,
        });

        // -------------------------------------------------------------------------

        server.route({
            method: 'POST',
            path: '/device/report/changes',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['report_view'] },
                },
            },
            handler: DeviceController().reports.reportDeviceChanges,
        });

        server.route({
            method: 'POST',
            path: '/device/report/changes/pdf',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['report_view'] },
                },
                payload: {
                    maxBytes: 10 * 1024 * 1024,
                },
            },
            handler: DeviceController().reports.exportDeviceChangesReportToPdf,
        });

        // -------------------------------------------------------------------------

        server.route({
            method: 'POST',
            path: '/device/report/vehicles',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['report_view'] },
                },
            },
            handler: DeviceController().reports.reportDriverVehicles,
        });

        server.route({
            method: 'POST',
            path: '/device/report/vehicles/pdf',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['report_view'] },
                },
                payload: {
                    maxBytes: 10 * 1024 * 1024,
                },
            },
            handler: DeviceController().reports.exportDriverVehiclesReportToPdf,
        });

        // -------------------------------------------------------------------------

        server.route({
            method: 'GET',
            path: '/device/test/alarmspeed/{IMEI}/{speed}',
            config: { auth: false },
            handler: DeviceController().tests.checkSpeed
        });

        server.route({
            method: 'POST',
            path: '/devices/getinfo',
            config: { auth: false },
            handler: DeviceController().getBachInfoViaIMEI,
        });

        server.route({
            method: 'POST',
            path: '/devices/addpolygon',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['polygon_edit'] },
                },
            },
            handler: DeviceController().setPolygon,
        });

        server.route({
            method: 'DELETE',
            path: '/devices/polygon/{id}',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['polygon_edit'] },
                },
            },
            handler: DeviceController().deletePolygon,
        });

        server.route({
            method: 'GET',
            path: '/device/{id}',
            config: { auth: false },
            handler: DeviceController().getDeviceInfo,
        });
        server.route({
            method: 'POST',
            path: '/device/updatelocation',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['device_edit'] },
                },
            },
            handler: DeviceController().updateLocationManually,
        });
        server.route({
            method: 'POST',
            path: '/device/status',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['status_edit'] },
                },
            },
            handler: DeviceController().setDeviceStatus,
        });
        server.route({
            method: 'DELETE',
            path: '/devices/deleteStatus/{id}',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['status_edit'] },
                },
            },
            handler: DeviceController().deleteDeviceStatus,
        });

        server.route({
            method: 'GET',
            path: '/devices/models',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['device_view'] },
                },
            },
            handler: DeviceController().getDeviceModels,
        });

        server.route({
            method: 'POST',
            path: '/devices/models',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['device_add'] },
                },
            },
            handler: DeviceController().addDeviceModels,
        });
    }

    return {
        register: registerRoutes,
    };
}

module.exports.DeviceRouter = DeviceRouter;
