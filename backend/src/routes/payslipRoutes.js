const express = require("express");
const router = express.Router();
const payslipController = require("../controllers/payslipController");

router.get("/:employeeId", payslipController.getPayslips);
router.get("/download/:payslipId", payslipController.downloadPayslip);

module.exports = router;
