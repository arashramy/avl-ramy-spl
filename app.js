require('safe_datejs');
const Hapi = require('hapi');
const hapiAuthJWT = require('hapi-auth-jwt2');
const hapiCorsHeaders = require('hapi-cors-headers');
const argv = require('minimist')(process.argv.slice(2));
const net = require('net');
const dgram = require('dgram');
const inert = require('inert');

require('./models');
const { logger } = require('./utility/customlog');
console.log("object")
const {
    DeviceRouter,
    DeviceGroupRouter,
    GPSDataRouter,
    UserRouter,
} = require('./routers');
const {
    FMXXXXController,
    GT06Controller,
    MVT380Controller,
    UserController,
} = require('./controllers');
const { DeviceCronJobs, ServerCronJobs } = require('./crons');

const cors = {
    origin: ['*'],
    headers: [
        'Accept',
        'Accept-Version',
        'Content-Type',
        'Api-Version',
        'X-Requested-With',
    ],
};

const server = new Hapi.Server({
    connections: {
        routes: { cors },
    },
});

const mode = 'm' in argv ? Number(argv.m) : 0;
const host = 'h' in argv ? String(argv.h) : '0.0.0.0';
const port = 'p' in argv ? Number(argv.p) : 4940;

if (mode === 0) {
    logger.info('run in api server mode');
    server.connection({
        host,
        port,
    });

    server.register(hapiAuthJWT, error => {
        if (error) logger.error(error);
        server.auth.strategy('jwt', 'jwt', true, {
            key: '729183456258456',
            validateFunc: UserController().validateUser,
            verifyOptions: { ignoreExpiration: true },
        });
    });

    server.register(inert, function(error) {
        if (error) logger.error(error);
    });

    server.ext('onPreResponse', hapiCorsHeaders);

    UserRouter().register(server);
    GPSDataRouter().register(server);
    DeviceGroupRouter().register(server);
    DeviceRouter().register(server);
    console.log(mode,"mode")

    server.start(function(error) {
        if (error) {
            throw error;
        }
        logger.info('Server running at:', server.info.uri);
    }); 

    console.log("this run in app ")
    ServerCronJobs.run();
} else if (mode === 1 || mode === 2) {
    logger.info('run in device mode');

    const createServer = Controller => {
        const controller = new Controller();
        return net.createServer(socket => {
            socket.on('data', data => {
                controller.insertNewMessage(data, socket);
            });
            socket.on('error', error => logger.debug(error));
        });
    };

    createServer(GT06Controller).listen(10000);
    createServer(MVT380Controller).listen(11000);
    createServer(FMXXXXController).listen(11002);
    createServer(FMXXXXController).listen(11003);
    createServer(FMXXXXController).listen(11004);
    createServer(FMXXXXController).listen(11005);
    createServer(FMXXXXController).listen(11006);

    createServer(GT06Controller).listen(12000);
    createServer(MVT380Controller).listen(13000);
    createServer(FMXXXXController).listen(18000);

    createServer(FMXXXXController).listen(4000);

    DeviceCronJobs().startScheduleEngine();

console.log("pppp")

    // eslint-disable-next-line func-names
    process.on('uncaughtException', function(e) {
        logger.log(e);
    });
} else if (mode === 3) {
    const PORT = 15000;
    const HOST = '0.0.0.0';

    const serverUDP = dgram.createSocket('udp4');

    serverUDP.on('listening', () => {
        const address = serverUDP.address();
        logger.info(
            `UDP Server listening on ${address.address}:${address.port}`
        );
    });

    serverUDP.on('message', (message, remote) => {
        logger.log(`${remote.address}:${remote.port} - ${message}`);
    });

    serverUDP.bind(PORT, HOST);
}




// 178.252.180.221:4000