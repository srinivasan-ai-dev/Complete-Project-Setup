const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");

router.get("/:employeeId", attendanceController.getAttendanceList);

module.exports = router;
