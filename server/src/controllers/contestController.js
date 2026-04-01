const contestService = require("../services/contestService");
const ApiError = require("../utils/ApiError");
const formatResponse = require("../utils/formatResponse");
const { requireFields } = require("../utils/validators");

async function createContest(req, res, next) {
  try {
    if (req.user.role !== "organizer") {
      throw new ApiError(403, "Only organizer can create contests");
    }
    requireFields(req.body, ["title"]);
    const contest = await contestService.createContest({
      ...req.body,
      organizerId: req.user.id
    });
    return res.status(201).json(formatResponse(201, "Contest created", contest));
  } catch (error) {
    return next(error);
  }
}

async function getContests(req, res, next) {
  try {
    const contests = await contestService.listContests(req.user);
    return res.status(200).json(formatResponse(200, "Contests list", contests));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createContest,
  getContests
};
