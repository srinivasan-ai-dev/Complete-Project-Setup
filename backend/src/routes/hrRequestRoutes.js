const express = require("express");
const router = express.Router();
const hrRequestController = require("../controllers/hrRequestController");

router.get("/", hrRequestController.getHrRequests);
router.post("/", hrRequestController.raiseHrRequest);

module.exports = router;
