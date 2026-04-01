const { Router } = require("express");
const contestController = require("../controllers/contestController");
const verifyAccessToken = require("../middleware/verifyAccessToken");

const router = Router();

router.use(verifyAccessToken);
router.post("/", contestController.createContest);
router.get("/", contestController.getContests);

module.exports = router;
