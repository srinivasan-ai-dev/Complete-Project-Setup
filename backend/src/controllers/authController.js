const authService = require("../services/authService");

// POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { username, password, branchName } = req.body;
        
        // Pass data to service layer where business logic resides
        const userData = await authService.loginUser(username, password, branchName);

        res.json({
            success: true,
            message: "Login successful",
            data: userData
        });
    } catch (error) {
        next(error);
    }
};
