const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leaveController");

router.get("/balances/:employeeId", leaveController.getLeaveBalances);
router.get("/history/:employeeId", leaveController.getLeaveHistory);
router.get("/", leaveController.getAllLeaveRequests);
router.post("/", leaveController.applyForLeave);
router.get("/:id", leaveController.getLeaveRequestById);
router.patch("/:id/status", leaveController.updateLeaveStatus);

module.exports = router;
