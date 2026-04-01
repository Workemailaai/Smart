const { Router } = require("express");
const templateController = require("../controllers/templateController");
const verifyAccessToken = require("../middleware/verifyAccessToken");

const router = Router();

router.use(verifyAccessToken);
router.get("/", templateController.getTemplates);

module.exports = router;
