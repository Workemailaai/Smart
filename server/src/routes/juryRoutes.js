const { Router } = require("express");
const juryController = require("../controllers/juryController");
const verifyAccessToken = require("../middleware/verifyAccessToken");

const router = Router();

router.use(verifyAccessToken);
router.post("/", juryController.createJuryMember);
router.get("/:contestId", juryController.getJuryMembers);

module.exports = router;
