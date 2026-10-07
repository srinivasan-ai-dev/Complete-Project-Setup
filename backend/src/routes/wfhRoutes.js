const express = require("express");
const router = express.Router();
const wfhController = require("../controllers/wfhController");

router.get("/:employeeId", wfhController.getWfhRequests);
router.post("/", wfhController.applyForWfh);

module.exports = router;
