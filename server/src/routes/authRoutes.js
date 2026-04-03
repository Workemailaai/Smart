const { Router } = require("express");
const AuthController = require("../controllers/authController");

const router = Router();

router.post("/sign-up", AuthController.signUp);
router.post("/sign-in", AuthController.signIn);
router.post("/refresh-tokens", AuthController.refreshTokens);
router.post("/sign-out", AuthController.signOut);

module.exports = router;
