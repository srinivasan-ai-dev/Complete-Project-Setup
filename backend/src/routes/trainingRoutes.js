const express = require("express");
const router = express.Router();
const trainingController = require("../controllers/trainingController");

router.get("/calendar", trainingController.getTrainingCalendar);
router.get("/attendance", trainingController.getTrainingAttendance);
router.post("/attendance", trainingController.createTrainingAttendance);
router.get("/", trainingController.getTrainings);

module.exports = router;
