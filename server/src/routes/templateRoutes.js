const { Router } = require("express");
const TemplateController = require("../controllers/templateController");
const verifyAccessToken = require("../middleware/verifyAccessToken");
const { uploadContestAssets } = require("../config/multerPublic");

const router = Router();

router.use(verifyAccessToken);

router.post("/", uploadContestAssets.any(), TemplateController.createTemplate);
router.get("/", TemplateController.getTemplates);
router.get("/:id", TemplateController.getTemplateById);
router.put("/:id", uploadContestAssets.any(), TemplateController.updateTemplate);
router.delete("/:id", TemplateController.deleteTemplate);

module.exports = router;
