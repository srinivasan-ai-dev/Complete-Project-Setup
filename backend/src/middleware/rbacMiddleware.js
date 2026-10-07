// Middleware for Role-Based Access Control (RBAC)

exports.authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ success: false, message: "Unauthorized: No role found" });
        }

        // Allow if the user has the required role (e.g. Employee, Manager, HR)
        const hasRole = allowedRoles.length === 0 || allowedRoles.includes(req.user.role);

        if (!hasRole) {
            return res.status(403).json({ success: false, message: "Forbidden: You do not have permission to perform this action" });
        }

        next();
    };
};

// Middleware to ensure Employee can only access their OWN data (unless they are HR/Manager)
exports.authorizeSelfOrElevated = (req, res, next) => {
    const requestedEmployeeId = Number(req.params.employeeId);
    
    if (req.user.role === 'Employee' && req.user.employee_id !== requestedEmployeeId) {
        return res.status(403).json({ success: false, message: "Forbidden: You can only view your own dashboard" });
    }
    
    next();
};
