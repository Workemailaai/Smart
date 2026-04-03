const { Router } = require("express");
const CriterionController = require("../controllers/criterionController");
const verifyAccessToken = require("../middleware/verifyAccessToken");

const router = Router();

router.use(verifyAccessToken);

router.post("/", CriterionController.createCriterion);
router.get("/:contestId", CriterionController.getCriteria);

module.exports = router;
