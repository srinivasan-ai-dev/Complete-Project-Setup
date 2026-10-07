const express = require("express");
const router = express.Router();
const competencyController = require("../controllers/competencyController");

router.get("/", competencyController.getCompetencies);
router.post("/", competencyController.createCompetency);

module.exports = router;
