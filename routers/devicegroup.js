var Hapi = require("hapi");
var DeviceGroupController = require("../controllers/devicegroup").DeviceGroupController;

function DeviceGroupRouter() {
    function registerRoutes(server) {
        server.route({
            method: 'GET',
            path: '/devicegroup',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['group_view'] },
                },
            },
            handler: DeviceGroupController().getDeviceGroups
        });

        server.route({
            method: 'GET',
            path: '/devicegroup/{groupId}',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['group_view'] },
                },
            },
            handler: DeviceGroupController().getDeviceGroupById
        });

        server.route({
            method: 'POST',
            path: '/devicegroup',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['group_add'] },
                },
            },
            handler: DeviceGroupController().addDeviceGroup
        });

        server.route({
            method: 'PUT',
            path: '/devicegroup',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['group_edit'] },
                },
            },
            handler: DeviceGroupController().editGroup
        });

        server.route({
            method: 'POST',
            path: '/devicegroup/device',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['group_device'] },
                },
            },
            handler: DeviceGroupController().addVehicleToGroup
        });

        server.route({
            method: 'POST',
            path: '/devicegroup/share',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['group_user'] },
                },
            },
            handler: DeviceGroupController().shareGroupsWithUser
        });

        server.route({
            method: 'POST',
            path: '/devicegroup/unshare',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['group_user'] },
                },
            },
            handler: DeviceGroupController().unshareGroupsWithUser
        });

        server.route({
            method: 'GET',
            path: '/devicegroup/device/{IMEI}',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['group_view'] },
                },
            },
            handler: DeviceGroupController().getDeviceGroups
        });

        server.route({
            method: 'DELETE',
            path: '/devicegroup/device/{vehicleId}/{groupId}',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['group_device'] },
                },
            },
            handler: DeviceGroupController().removeVehicleFromGroup
        });

        server.route({
            method: 'GET',
            path: '/devicegroup/user/{id}',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['group_view'] },
                },
            },
            handler: DeviceGroupController().getUserDeviceGroups
        });

        server.route({
            method: 'GET',
            path: '/devicegroup/vehicleofgroup/{groupId}',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['+group_view', '+device_view'] },
                },
            },
            handler: DeviceGroupController().getVehiclesofGroup
        });


        server.route({
            method: 'POST',
            path: '/devicegroup/vehicleofgroup',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['+group_view', '+device_view'] },
                },
            },
            handler: DeviceGroupController().getVehiclesofMultiGroup
        });

        server.route({
            method: 'GET',
            path: '/devicegroup/report/vehicleofgroup/{groupId}/{userId}',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['+group_view', '+report_view'] },
                },
            },
            handler: DeviceGroupController().reports.reportVehicleOfGroups
        });
    }

    return {
        register: registerRoutes
    }
}

module.exports.DeviceGroupRouter = DeviceGroupRouter;
