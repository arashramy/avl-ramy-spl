const datejs = require('safe_datejs');
const mongoose = require('mongoose');
const jalali_moment = require('moment-jalaali');
const moment = require('moment');
const jwt = require('jwt-simple');
const fs = require('fs');
const bcrypt = require('bcrypt-nodejs');

const { logger } = require('../utility/customlog.js');
const { UserModel, ActivityModel, TokenModel } = require('../models/user');

const { util } = require('../utility/util');
const PhoneBookModel = require('../models/user/phoneBookModel');
const VehicleTypeModel = require('../models/gpslocation/VehicleTypeModel');

function UserController() {
    function validate(decoded, request, callback) {
        UserModel.findOne({ _id: decoded.iss }, (error, user) => {
            if (!user) {
                return callback(new Error('Not found'), false);
            }
            if (!error) {
                TokenModel.exists(
                    {
                        token: request.headers.authorization,
                        state: true,
                        userId: user.id,
                    },
                    (countError, tokenExists) => {
                        if (tokenExists) {
                            request.user = user;
                        }
                        return callback(countError, tokenExists, {
                            scope: user.roles.map(role => role.rolename),
                        });
                    }
                );
            } else {
                return callback(new Error('Not authorized'));
            }
        });
    }

    function disableOtherAccounts(userId) {
        const today = new Date();
        return TokenModel.update(
            { userId, state: true },
            { state: false, deleted: today.AsDateJs() },
            { multi: true }
        );
    }

    function updateUserActivity(activityname, user) {
        const activity = new ActivityModel({
            activityname,
            activitydate: new Date().AsDateJs(),
            username: user.username,
        });
        activity.save(null);
    }

    function signout(req, res) {
        TokenModel.findOne(
            { token: req.headers.authorization, userId: req.user.id },
            function(error, token) {
                if (error) {
                    logger.error(error);
                    return res(error).code(500);
                }
                token.state = false;
                token.save(function(error) {
                    if (error) {
                        logger.error(error);
                        return res(error).code(500);
                    }
                    return res({ state: true }).code(200);
                });
            }
        );
    }

    function verifyPassword(req, res) {
        try {
            req.user.verifyPassword(req.payload.password, function(
                error,
                isMatch
            ) {
                if (error) {
                    logger.error(error);
                    return res(
                        'Authentication error: error in verify password'
                    ).code(401);
                }

                if (!isMatch) {
                    logger.debug('Authentication error : password is wrong');
                    return res('Authentication error : password is wrong').code(
                        401
                    );
                }
                if (
                    req.user.username != 'admin' &&
                    req.user.isapproved == false
                ) {
                    logger.debug('user has been disabled');
                    return res('user has been disabled').code(403);
                }

                return res('ok').code(200);
            });
        } catch (ex) {
            logger.error(error);
            return res(ex).code(404);
        }
    }

    async function signin(req, res) {
        // console.log("this route belong to singin")
        const { username, password } = req.payload;
        try {
            console.log("req.payload")

            console.log(req.payload)
            const user = await UserModel.findOne({ username });
            if (!user) {
                logger.warn('user not found warn 1', username);
                return res({
                    type: 'Authentication Error',
                    msg: 'User not found ',
                }).code(401);
            }
            user.verifyPassword(password, async (error, isMatch) => {
                if (error) {
                    logger.error(error);
                    return res({
                        type: 'Transaction Error',
                        msg: 'Error in verifying password',
                    }).code(401);
                }
                if (!isMatch) {
                    return res({
                        type: 'Authentication Error',
                        msg: 'Wrong password',
                    }).code(401);
                }
                if (user.username !== 'admin' && !user.isapproved) {
                    return res({ msg: 'user has been disabled' }).code(403);
                }
                if (user.islockedout) {
                    return res({
                        msg: "user can't login, user doesn't exist or is blocked.",
                    }).code(405);
                }
                updateUserActivity('ورود به سیستم', user);
                await disableOtherAccounts(user.id);
                const expires = moment()
                    .add(7, 'days')
                    .valueOf(); 
                const token = jwt.encode(
                    {
                        iss: user.id,
                        exp: expires,
                    },
                    '729183456258456'
                );
                const userToken = new TokenModel({
                    userId: user.id,
                    token,
                    exp: expires,
                });
                await userToken.save();
                const result = Object.assign(user.getBrief(), {
                    authorization: token,
                });
                return res(result);
            }
            );
        } catch (error) {
            logger.error(error);
            return res('Authentication error: error in fetching data').code(
                401
            );
        }
    }

    function signup(req, res) {
        const user = new UserModel({
            username: req.payload.username,
            hashedPassword: req.payload.password,
            firstname: req.payload.firstName,
            lastname: req.payload.lastName,
            gender: req.payload.gender,
            email: req.payload.email,
            mobileNumber: req.payload.mobileNumber,
            salt: '1',
            isapproved: true,
            islockedout: false,
        });
        user.roles.push({ rolename: 'user' });
        //  user.activities.push({ activityname: 'ثبت نام', activitydate: (new Date()).AsDateJs() });
        user.save(function(error) {
            if (error) {
                logger.error(error);
                return res({ msg: error }).code(401);
            }
            logger.info(
                `New user ${user.firstname} ${user.lastname} added successfully`
            );
            return res({
                message: 'user added to database successfully',
                userId: user.id,
            });
        });
    }

    function editUser(req, res) {
        try {
            const {
                userId,
                username,
                firstname,
                lastname,
                gender,
                email,
                mobileNumber,
            } = req.payload;
            if (!userId) {
                return res({
                    msg: 'userId required',
                    code: '422',
                    validate: false,
                    field: 'userId',
                }).code(422);
            }
            UserModel.findOne({ _id: userId }, function(error, user) {
                if (error) {
                    logger.error(error);
                    return res(error).code(500);
                }
                username && (user.username = username);
                firstname && (user.firstname = firstname);
                lastname && (user.lastname = lastname);
                gender && (user.gender = gender);
                email && (user.email = email);
                mobileNumber && (user.mobileNumber = mobileNumber);

                user.save(function(error) {
                    if (error) {
                        logger.error(error);
                        return res(error).code(500);
                    }

                    return res(user).code(200);
                });
            });
        } catch (ex) {
            logger.error(ex);
            return res({ msg: ex }).code(404);
        }
    }

    function getUserList(req, res) {
        // updateUserActivity("مشاهده لیست کاربران", req.user);
        UserModel.find()
            .select({
                _id: 1,
                username: 1,
                firstname: 1,
                lastname: 1,
                gender: 1,
                email: 1,
                mobileNumber: 1,
                roles: 1,
                islockedout: 1,
                deviceModel: 1,
            })
            .populate({
                path: 'deviceModel',
                select: { name: 1, _id: 0 },
            })
            .populate('groups', 'name')
            .lean()
            .exec(function(error, users) {
                if (error) {
                    logger.error(error);
                    return res({ msg: error }).code(401);
                }
                return res(users);
            });
    }

    function getUser(req, res) {
        updateUserActivity('دریافت کاربر یا ایمیل', req.user);
        if (req.params.email) {
            UserModel.findOne({ email: req.params.email }, function(
                error,
                user
            ) {
                if (error) {
                    logger.error(error);
                    return res(error).code(500);
                }
                return res(user.getBrief());
            });
        }
    }

    function getUserById(req, res) {
        updateUserActivity('دریافت کاربر با شناسه', req.user);
        if (req.body.userId) {
            UserModel.findOne({ _id: req.body.userId }, function(error, user) {
                if (error) {
                    logger.error(error);
                    return res(err).code(500);
                }
                return res(user.getBrief());
            });
        }
    }

    function getCurrentUser(req, res) {
        updateUserActivity('دریافت اطلاعات کاربر فعلی', req.user);
        return res(req.user.getBrief());
    }

    function changeUserStatus(req, res) {
        try {
            UserModel.findOne({ _id: req.body.userId }, (error, user) => {
                if (error) {
                    logger.error(error);
                    return res(error).code(500);
                }
                if (!user) {
                    return res('not found').code(404);
                }
                user.isapproved = Boolean(!user.isapproved);
                user.save(null);
                updateUserActivity(
                    `تغییر وضعیت کاربر : ${req.body.userId} : ${user.isapproved}`,
                    req.user
                );
                return res('ok');
            });
        } catch (ex) {
            logger.error(ex);
            return res({ msg: ex }).code(404);
        }
    }

    function getUserActivity(req, res) {
        const { page: pageNumber, pageSize } = req.params;
        const { userId } = req.params;
        UserModel.findOne({ _id: userId }).exec((error, user) => {
            if (error) {
                logger.error(error);
                return res(error).code(404);
            }
            if (!user) {
                return res('not found').code(404);
            }
            ActivityModel.find({ username: user.username })
                .skip((pageSize - 1) * pageNumber)
                .limit(pageSize)
                .lean()
                .exec((err, activities) => {
                    const result = activities.map(activity => {
                        const { activitydate, activityname, id } = activity;
                        activitydate.setHours(
                            activitydate.getHours() + 3,
                            activitydate.getMinutes() + 30
                        );
                        const jalaliActivityDate = jalali_moment(
                            activitydate.toISOString().replace('T', ' '),
                            'YYYY-M-D HH:mm:ss'
                        ).format('jYYYY/jM/jD HH:mm:ss'); // 1392/6/31 23:59:59
                        return {
                            _id: id,
                            activityname,
                            activitydate: jalaliActivityDate,
                        };
                    });
                    return res(result);
                });
        });
    }

    function getUserActivityCount(req, res) {
        const { userId } = req.params;
        UserModel.findById(userId, (error, user) => {
            if (error) {
                logger.error(error);
                return res(error).code(404);
            }
            ActivityModel.countDocuments({ username: user.username }).exec(
                (err, count) => {
                    if (err) {
                        logger.error(err);
                        return res(err).code(404);
                    }
                    return res({ count });
                }
            );
        });
    }

    function changeUserPassword(req, res) {
        try {
            const old_password = req.payload.oldpassword;
            const user_id = req.user._id;
            const new_password = req.payload.password;

            if (req.payload.password) {
                UserModel.findOne({ _id: user_id }).exec(function(err, user) {
                    if (err) {
                        logger.error(err);
                        return res({ msg: err }).code(404);
                    }
                    if (user) {
                        user.verifyPassword(old_password, function(
                            err,
                            isMatch
                        ) {
                            if (!isMatch) {
                                return res({
                                    msg: 'old password is not valid',
                                }).code(404);
                            }

                            user.hashedPassword = new_password;
                            user.save(null);
                            return res('save successfully');
                        });
                    }
                });
            }
        } catch (error) {
            logger.error(error);
            return res(error).code(404);
        }
    }

    function changeOtherPassword(req, res) {
        try {
            const user_id = req.payload._id;
            const new_password = req.payload.password;

            if (req.payload.password) {
                UserModel.findOne({ _id: user_id }).exec(function(err, user) {
                    if (err) {
                        logger.error(err);
                        return res({ msg: err }).code(404);
                    }
                    if (user) {
                        user.hashedPassword = new_password;
                        user.save(null);
                        return res('save successfully');
                    }
                });
            }
        } catch (ex) {
            logger.error(ex);
            return res(ex).code(404);
        }
    }

    function uploadProfilePicture(req, res) {
        try {
            const data = req.body;
            if (data.file) {
                const { userId } = data;
                const name = data.file.hapi.filename;
                UserModel.findOne({ _id: userId }).exec(function(err, user) {
                    if (err) {
                        logger.error(err);
                        return res({ msg: err }).code(404);
                    }
                    if (!user) {
                        return res({ msg: 'user not found' }).code(404);
                    }
                    user.profileImage = name;
                    user.save(null);
                    const path = `${__dirname}/../uploads/users/${userId}/${name}`;
                    if (!fs.existsSync(`${__dirname}/../uploads`)) {
                        fs.mkdirSync(`${__dirname}/../uploads`);
                    }
                    if (!fs.existsSync(`${__dirname}/../uploads/users`)) {
                        fs.mkdirSync(`${__dirname}/../uploads/users`);
                    }
                    if (
                        !fs.existsSync(
                            `${__dirname}/../uploads/users/${userId}`
                        )
                    ) {
                        fs.mkdirSync(`${__dirname}/../uploads/users/${userId}`);
                    }
                    const file = fs.createWriteStream(path);
                    file.on('error', function(errFile) {
                        logger.error(errFile);
                        return res({ msg: errFile }).code(404);
                    });
                    data.file.pipe(file);
                    data.file.on('end', function(errFile) {
                        const ret = {
                            filename: data.file.hapi.filename,
                            headers: data.file.hapi.headers,
                        };
                        return res(JSON.stringify(ret)).code(200);
                    });
                });
            } else {
                return res({
                    msg: 'File not found',
                }).code(404);
            }
        } catch (ex) {
            logger.error(ex);
            return res({ msg: ex }).code(404);
        }
    }

    function getUserPicture(req, res) {
        try {
            const { userId } = req.params;
            const { imageName } = req.params;
            return res.file(
                `${__dirname}/../uploads/users/${userId}/${imageName}`
            );
        } catch (ex) {
            logger.error(ex);
            return res({ msg: ex }).code(404);
        }
    }

    function forgotPasswordRequest(req, res) {
        const user_name = req.payload.username;

        UserModel.findOne({ username: user_name }).exec(function(err, user) {
            if (err) {
                return res(err).code(404);
            }

            if (!user) {
                return res({ msg: 'cant find user' }).code(404);
            }

            const locals = {
                name: `${user.firstname} ${user.lastname}`,
                subject: 'Recovery password',
                email: user.email,
                username: user.username,
                password: Math.floor(Math.random() * 100000),
                link_url: 'http://portal.keloud.ir',
                link_text: 'LOGIN',
            };

            user.hashedPassword = locals.password;
            user.save();

            util.send_email('mail/password', locals, e => logger.error(e));

            return res({ msg: 'mail sended' }).code(200);
        });
    }

    function unlockUser(req, res) {
        const user_id = req.params.userId;

        UserModel.findOne({ _id: user_id }).exec(function(err, user) {
            if (err) return res(err).code(404);
            user.islockedout = false;
            user.save();

            return res({ msg: 'ok' }).code(200);
        });
    }

    function lockUser(req, res) {
        const user_id = req.params.userId;

        UserModel.findOne({ _id: user_id }).exec(function(err, user) {
            if (err) return res(err).code(404);
            user.islockedout = true;
            user.save();

            return res({ msg: 'ok' }).code(200);
        });
    }

    async function addRoleToUser(req, res) {
        try {
            const { userId, roleName } = req.payload;
            const user = await UserModel.findOne({ _id: userId });
            if (!user) {
                return res({ msg: 'User not found' }).code(404);
            }
            if (!user.roles.find(role => role.rolename === roleName)) {
                user.roles.push({ rolename: roleName, roledesc: roleName });
                await user.save();
            }
            return res({
                msg: 'Role added to user successfully!',
                data: user,
            }).code(200);
        } catch (ex) {
            logger.error(ex);
            return res({ msg: ex }).code(404);
        }
    }

    async function addRolesToUser(req, res) {
        try {
            const { roleNames, userId } = req.payload;
            const user = await UserModel.findOne({ _id: userId });
            if (!user) {
                return res({ msg: 'User not found' }).code(404);
            }
            user.roles = roleNames.map(roleName => ({
                rolename: roleName,
                roledesc: roleName,
            }));
            await user.save();
            return res({
                msg: 'Roles added to user successfully!',
                data: user,
            }).code(200);
        } catch (ex) {
            logger.error(ex);
            return res({ msg: ex }).code(404);
        }
    }

    async function removeRoleFromUser(req, res) {
        try {
            const { userId, roleName } = req.payload;
            const user = await UserModel.findOne({ _id: userId });
            if (!user) {
                return res({ msg: 'User not found' }).code(404);
            }
            user.roles = user.roles.filter(role => role.rolename !== roleName);
            await user.save();
            return res({
                msg: 'Role removed from user successfully!',
                data: user,
            }).code(200);
        } catch (ex) {
            logger.error(ex);
            return res({ msg: ex }).code(404);
        }
    }

    function removeRolesFromUser(req, res) {
        try {
            const { roles } = req.payload;
            const { userId } = req.payload;
            UserModel.findOne({ _id: userId }).exec(function(err, user) {
                if (err) {
                    return res({
                        msg: err,
                    }).code(404);
                }
                if (user) {
                    let find = false;
                    for (let i = 0; i < user.roles.length; i++) {
                        for (let j = 0; j < roles.length; j++) {
                            if (user.roles[i].rolename == roles[j]) {
                                user.roles.splice(i, 1);
                                find = true;
                            }
                        }
                    }
                    user.save();
                    return res({
                        msg: 'user removed from role successfully!',
                        data: user,
                    }).code(200);
                }

                return res({
                    msg: 'User not found',
                }).code(404);
            });
        } catch (ex) {
            logger.error(ex);
            return res({ msg: ex }).code(404);
        }
    }

    async function addPhoneNumber(req, res) {
        try {
            const { firstName, lastName, phoneNumber, email } = req.payload;
            if (!firstName) {
                return res({
                    msg: 'نام الزامی است',
                    code: '422',
                    validate: false,
                    field: 'firstName',
                }).code(422);
            }
            if (!lastName) {
                return res({
                    msg: 'نام خانوادگی الزامی است',
                    code: '422',
                    validate: false,
                    field: 'lastName',
                }).code(422);
            }
            if (!phoneNumber) {
                return res({
                    msg: 'شماره تلفن الزامی است',
                    code: '422',
                    validate: false,
                    field: 'phoneNumber',
                }).code(422);
            }

            if (await PhoneBookModel.exists({ phoneNumber })) {
                return res({
                    msg: 'این شماره تلفن قبلا ثبت شده است',
                    code: '422',
                    validate: false,
                    field: 'phoneNumber',
                }).code(422);
            }

            const newPhoneNumber = new PhoneBookModel({
                firstName,
                lastName,
                phoneNumber,
                email,
            });

            await newPhoneNumber.save(async function(err) {
                if (err) {
                    return res({
                        msg: err,
                    }).code(500);
                }
                return res(newPhoneNumber).code(200);
            });
        } catch (ex) {
            logger.error(ex);
            return res({ msg: ex }).code(404);
        }
    }

    function getPhoneBook(req, res) {
        PhoneBookModel.find()
            .select({
                firstName: 1,
                lastName: 1,
                phoneNumber: 1,
                email: 1,
                dateCreated: 1,
            })
            .exec(function(error, numbers) {
                if (error) {
                    logger.error(error);
                    return res({ msg: error }).code(401);
                }
                return res(numbers);
            });
    }

    function setUserDeviceModel(req, res) {
        const { username, deviceModel } = req.payload;
        UserModel.findOne({ username }).exec(async function(err, user) {
            if (err) {
                return res(err).code(404);
            }
            if (!user) {
                return res({ msg: 'cant find user' }).code(404);
            }
            user.deviceModel = await VehicleTypeModel.find({
                name: { $in: deviceModel },
            });
            await user.save();
            return res({ msg: 'user updated!' }).code(200);
        });
    }
    function ramygetUsers(req, res) {
        clg
       const users= UserModel.find({});
          
   
            return res({ users }).code(200);
        };
    

    return {
        editUser,
        changeUserPassword,
        changeOtherPassword,
        changeUserStatus,
        disableOtherAccounts,
        getCurrentUser,
        getUser,
        getUserActivity,
        getUserActivityCount,
        getUserById,
        getUserList,
        validateUser: validate,
        verifyPassword,
        signin,
        signout,
        signup,
        updateUserActivity,
        uploadProfilePicture,
        getUserPicture,
        forgotPasswordRequest,
        lockUser,
        unlockUser,
        addRoleToUser,
        addRolesToUser,
        removeRoleFromUser,
        removeRolesFromUser,
        addPhoneNumber,
        getPhoneBook,
        setUserDeviceModel,
        ramygetUsers
    };
}

module.exports.UserController = UserController;
