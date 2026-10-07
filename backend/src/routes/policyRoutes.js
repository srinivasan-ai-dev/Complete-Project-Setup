const express = require("express");
const router = express.Router();
const policyController = require("../controllers/policyController");

router.get("/", policyController.getPolicies);

module.exports = router;
