const { Router } = require("express");
const ScoreController = require("../controllers/scoreController");
const verifyAccessToken = require("../middleware/verifyAccessToken");

const router = Router();

router.use(verifyAccessToken);

router.put("/", ScoreController.putScore);
router.get("/:contestId", ScoreController.getScores);

module.exports = router;
