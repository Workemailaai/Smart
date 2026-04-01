const { Router } = require("express");
const authRoutes = require("./authRoutes");
const contestRoutes = require("./contestRoutes");
const participantRoutes = require("./participantRoutes");
const juryRoutes = require("./juryRoutes");
const criterionRoutes = require("./criterionRoutes");
const scoreRoutes = require("./scoreRoutes");
const templateRoutes = require("./templateRoutes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/contests", contestRoutes);
router.use("/participants", participantRoutes);
router.use("/jury", juryRoutes);
router.use("/criteria", criterionRoutes);
router.use("/scores", scoreRoutes);
router.use("/templates", templateRoutes);

module.exports = router;
