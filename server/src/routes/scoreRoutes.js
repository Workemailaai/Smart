const { Router } = require("express");
const scoreController = require("../controllers/scoreController");
const verifyAccessToken = require("../middleware/verifyAccessToken");

const router = Router();

router.use(verifyAccessToken);
router.put("/", scoreController.putScore);
router.get("/:contestId", scoreController.getScores);

module.exports = router;
