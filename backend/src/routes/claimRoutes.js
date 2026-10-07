const express = require("express");
const router = express.Router();
const claimController = require("../controllers/claimController");

router.get("/payment-history/:employeeId", claimController.getClaimPaymentHistory);
router.get("/:employeeId", claimController.getClaims);
router.post("/", claimController.raiseClaim);
router.patch("/:id", claimController.updateClaim);

module.exports = router;
