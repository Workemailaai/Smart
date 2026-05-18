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
router.delete("/:id", ContestController.deleteContest);
router.get("/:id/jury-view", ContestController.getJuryContestView);
router.put("/:id/criteria-order", ContestController.reorderJuryCriteria);
router.put(
  "/:id/roster",
  uploadContestAssets.any(),
  ContestController.updateContestRoster
);
router.get("/:id/organizer-view", ContestController.getOrganizerContestView);
router.get("/:id/results-view", ContestController.getContestResultsView);
router.get("/:id/export-report", ContestController.exportContestReport);
router.post("/:id/jury-submit", ContestController.submitJuryScores);
router.post("/:id/jury-revote", ContestController.revokeJurySubmission);
router.post("/:id/complete", ContestController.completeContest);

module.exports = router;
