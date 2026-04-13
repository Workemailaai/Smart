const { Router } = require("express");
const ContestController = require("../controllers/contestController");
const verifyAccessToken = require("../middleware/verifyAccessToken");
const { uploadContestAssets } = require("../config/multerPublic");

const router = Router();

router.get("/meta/contest-types", ContestController.getContestTypes);

router.use(verifyAccessToken);

router.post("/", ContestController.createContest);
router.post(
  "/create-full",
  uploadContestAssets.any(),
  ContestController.createContestFull
);
router.get("/", ContestController.getContests);

module.exports = router;
