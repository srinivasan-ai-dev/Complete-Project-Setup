const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles, authorizeSelfOrElevated } = require("../middleware/rbacMiddleware");

// Dashboard route should be accessed by authenticated users, and employees can only see their own
router.get("/:employeeId", authenticate, authorizeRoles('Employee', 'HR', 'Manager'), authorizeSelfOrElevated, dashboardController.getDashboardData);

module.exports = router;
