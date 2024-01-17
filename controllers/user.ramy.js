function UserController() {
    function signout(req, res) {
        return res({ state: true }).code(200);
    }
    return {
       
        signout,
  
    };
}
module.exports.UserController = UserController;
