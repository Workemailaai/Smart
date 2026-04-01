const criterionService = require("../services/criterionService");
const ApiError = require("../utils/ApiError");
const formatResponse = require("../utils/formatResponse");
const { requireFields } = require("../utils/validators");

async function createCriterion(req, res, next) {
  try {
    if (req.user.role !== "organizer") {
      throw new ApiError(403, "Only organizer can create criteria");
    }
    requireFields(req.body, ["contestId", "name"]);
    const criterion = await criterionService.createCriterion({
      ...req.body,
      organizerId: req.user.id
    });
    return res.status(201).json(formatResponse(201, "Criterion created", criterion));
  } catch (error) {
    return next(error);
  }
}

async function getCriteria(req, res, next) {
  try {
    const criteria = await criterionService.listCriteria(req.params.contestId);
    return res.status(200).json(formatResponse(200, "Criteria list", criteria));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createCriterion,
  getCriteria
};
