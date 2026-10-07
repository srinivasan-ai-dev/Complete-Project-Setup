const express = require("express");
const router = express.Router();
const taxController = require("../controllers/taxController");

router.get("/:employeeId", taxController.getTaxDetails);

module.exports = router;
