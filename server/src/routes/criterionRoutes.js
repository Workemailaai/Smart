const { Router } = require("express");
const criterionController = require("../controllers/criterionController");
const verifyAccessToken = require("../middleware/verifyAccessToken");

const router = Router();

router.use(verifyAccessToken);
router.post("/", criterionController.createCriterion);
router.get("/:contestId", criterionController.getCriteria);

module.exports = router;
