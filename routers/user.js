const userController = require('../controllers/user').UserController;

function UserRouter() {
    function registerRoutes(server) {
        server.route({
            method: 'GET',
            path: '/user/signout',
            handler: userController().signout,
        });

        server.route({
            method: 'POST',
            path: '/user/signin',
            config: { auth: false },
            handler: userController().signin,
        });

        server.route({
            method: 'POST',
            path: '/user/verifyPassword',
            handler: userController().verifyPassword,
        });

        server.route({
            method: 'POST',
            path: '/user',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['user_add'] },
                },
            },
            handler: userController().signup,
        });

        server.route({
            method: 'PUT',
            path: '/user',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['user_edit'] },
                },
            },
            handler: userController().editUser,
        });

        server.route({
            method: 'POST',
            path: '/user/changePassword',
            config: { auth: 'jwt' },
            handler: userController().changeUserPassword,
        });

        server.route({
            method: 'POST',
            path: '/user/changePassword/others',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['user_password'] },
                },
            },
            handler: userController().changeOtherPassword,
        });

        server.route({
            method: 'GET',
            path: '/user',
            config: { auth: false },
            handler: userController().getUserList,
        });

        server.route({
            method: 'GET',
            path: '/user/{id}',
            handler: userController().getUserById,
        });

        server.route({
            method: 'GET',
            path: '/user/activity/{page}/{pageSize}/{userId}',
            handler: userController().getUserActivity,
        });

        server.route({
            method: 'GET',
            path: '/user/activity/{userId}',
            handler: userController().getUserActivityCount,
        });

        server.route({
            method: 'POST',
            path: '/user/changeStatus',
            handler: userController().changeUserStatus,
        });

        server.route({
            method: 'POST',
            path: '/user/addRoleToUser',
            handler: userController().addRoleToUser,
        });

        server.route({
            method: 'Get',
            path: '/user/currentUser',
            handler: userController().getCurrentUser,
        });

        server.route({
            method: 'GET',
            path: '/user/lock/{userId}',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['user_block'] },
                },
            },
            handler: userController().lockUser,
        });

        server.route({
            method: 'GET',
            path: '/user/unlock/{userId}',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['user_block'] },
                },
            },
            handler: userController().unlockUser,
        });

        server.route({
            method: 'POST',
            path: '/user/uploadProfilePicture',
            config: {
                auth: false,
                payload: {
                    output: 'stream',
                    parse: true,
                    allow: 'multipart/form-data',
                    maxBytes: 419430400,
                },
            },
            handler: userController().uploadProfilePicture,
        });

        server.route({
            method: 'GET',
            path: '/user/profilePicture',
            config: { auth: false },
            handler: userController().getUserPicture,
        });

        server.route({
            method: 'POST',
            path: '/user/roles/add',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['user_role'] },
                },
            },
            handler: userController().addRoleToUser,
        });

        server.route({
            method: 'POST',
            path: '/user/roles/many/add',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['user_role'] },
                },
            },
            handler: userController().addRolesToUser,
        });

        server.route({
            method: 'POST',
            path: '/user/roles/remove',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['user_role'] },
                },
            },
            handler: userController().removeRoleFromUser,
        });

        server.route({
            method: 'POST',
            path: '/user/roles/many/remove',
            config: {
                auth: {
                    strategy: 'jwt',
                    access: { scope: ['user_role'] },
                },
            },
            handler: userController().removeRolesFromUser,
        });

        server.route({
            method: 'POST',
            path: '/user/passwordrecovery',
            config: { auth: false },
            handler: userController().forgotPasswordRequest,
        });

        server.route({
            method: 'POST',
            path: '/user/phoneNumbers/add',
            handler: userController().addPhoneNumber,
        });

        server.route({
            method: 'GET',
            path: '/user/phoneNumbers/show',
            handler: userController().getPhoneBook,
        });

        server.route({
            method: 'POST',
            path: '/user/deviceModel',
            handler: userController().setUserDeviceModel,
        });
        server.route({
            method: 'GET',
            path: '/user/ramy',
            handler: userController().ramygetUsers,
        });
    }

    return {
        register: registerRoutes,
    };
}

module.exports.UserRouter = UserRouter;
