const scoreService = require("../services/scoreService");
const ApiError = require("../utils/ApiError");
const formatResponse = require("../utils/formatResponse");
const { requireFields } = require("../utils/validators");

async function putScore(req, res, next) {
  try {
    if (req.user.role !== "jury") {
      throw new ApiError(403, "Only jury can put scores");
    }
    requireFields(req.body, ["contestId", "participantId", "criterionId", "value"]);
    const score = await scoreService.putScore({
      ...req.body,
      userId: req.user.id
    });
    return res.status(200).json(formatResponse(200, "Score saved", score));
  } catch (error) {
    return next(error);
  }
}

async function getScores(req, res, next) {
  try {
    const scores = await scoreService.getContestScores(req.params.contestId);
    return res.status(200).json(formatResponse(200, "Scores list", scores));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  putScore,
  getScores
};
