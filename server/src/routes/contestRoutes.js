const { Router } = require("express");
const ContestController = require("../controllers/contestController");
const verifyAccessToken = require("../middleware/verifyAccessToken");

const router = Router();

router.use(verifyAccessToken);

router.post("/", ContestController.createContest);
router.get("/", ContestController.getContests);

module.exports = router;
