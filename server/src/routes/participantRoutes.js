const { Router } = require("express");
const participantController = require("../controllers/participantController");
const verifyAccessToken = require("../middleware/verifyAccessToken");

const router = Router();

router.use(verifyAccessToken);
router.post("/", participantController.createParticipant);
router.get("/:contestId", participantController.getParticipants);

module.exports = router;
