const express = require("express");
const router = express.Router();
const certificationController = require("../controllers/certificationController");

router.get("/", certificationController.getCertifications);
router.post("/", certificationController.createCertification);

module.exports = router;
