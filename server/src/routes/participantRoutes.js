const { Router } = require("express");
const ParticipantController = require("../controllers/participantController");
const verifyAccessToken = require("../middleware/verifyAccessToken");

const router = Router();

router.use(verifyAccessToken);

router.post("/", ParticipantController.createParticipant);
router.get("/:contestId", ParticipantController.getParticipants);

module.exports = router;
