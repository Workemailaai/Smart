const { Router } = require("express");
const TemplateController = require("../controllers/templateController");
const verifyAccessToken = require("../middleware/verifyAccessToken");

const router = Router();

router.use(verifyAccessToken);

router.post("/", TemplateController.createTemplate);
router.get("/", TemplateController.getTemplates);
router.get("/:id", TemplateController.getTemplateById);
router.delete("/:id", TemplateController.deleteTemplate);

module.exports = router;
