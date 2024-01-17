var Hapi = require("hapi");
var GPSDataController = require("../controllers/gpslocation").GPSDataController;

function GPSDataRouter() {
    function registerRoutes(server) {
        server.route({
            method: 'GET',
            path: '/gpsdata',
            config: { auth: false },
            handler: GPSDataController().getGPSData
        });

        server.route({
            method: 'GET',
            path: '/gpsdata/{id}/{skip}/{count}',
            config: { auth: false },
            handler: GPSDataController().getGPSDataIMEI
        });

        server.route({
            method: 'GET',
            path: '/gpsdata/group/IMEI',
            config: { auth: false },
            handler: GPSDataController().getAllIMEIs
        });

        server.route({
            method: 'GET',
            path: '/gpsdata/last/{IMEI}/{count}',
            config: { auth: false },
            handler: GPSDataController().getNLastDataIMEI
        });

        server.route({
            method: 'GET',
            path: '/gpsdata/report/{IMEI}',
            config: { auth: false },
            handler: GPSDataController().getGPSDataIMEIReport
        });

        server.route({
            method: 'GET',
            path: '/gpsdata/generateaddress',
            config: { auth: false },
            handler: GPSDataController().updateAddressOfLocations
        });
    }

    return{
        register: registerRoutes
    }
}

module.exports.GPSDataRouter = GPSDataRouter;
