const { verifyToken } = require("../utils/jwtHelper");

exports.authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "No token provided, authorization denied" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verifyToken(token);
        req.user = decoded; // Attach user payload to request
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Token is invalid or expired" });
    }
};
