const { Router } = require("express");
const JuryController = require("../controllers/juryController");
const verifyAccessToken = require("../middleware/verifyAccessToken");

const router = Router();

router.use(verifyAccessToken);

router.post("/", JuryController.createJuryMember);
router.get("/:contestId", JuryController.getJuryMembers);

module.exports = router;
