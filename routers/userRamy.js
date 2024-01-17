const userController = require('../controllers/user.ramy').UserController;

function UserRamyRouter() {
    function registerRoutes(server) {
        server.route({
            method: 'GET',
            path: '/user/ramy',
            config: { auth: false },
            handler: userController().ramygetUsers,
        });

    }

    return {
        register: UserRamyRouter,
    };
}

module.exports.UserRamyRouter = UserRamyRouter;
