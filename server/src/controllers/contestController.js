const ContestService = require("../services/contestService");
const ApiError = require("../utils/ApiError");
const formatResponse = require("../utils/formatResponse");
const { requireFields } = require("../utils/validators");

class ContestController {
  /** Создание конкурса организатором */
  static async createContest(req, res, next) {
    try {
      if (req.user.role !== "organizer") {
        throw new ApiError(403, "Only organizer can create contests");
      }
      requireFields(req.body, ["title"]);
      const contest = await ContestService.createContest({
        ...req.body,
        organizerId: req.user.id
      });
      return res
        .status(201)
        .json(formatResponse(201, "Contest created", contest));
    } catch (error) {
      return next(error);
    }
  }

  /** Получение списка конкурсов по роли */
  static async getContests(req, res, next) {
    try {
      const contests = await ContestService.listContests(req.user);
      return res
        .status(200)
        .json(formatResponse(200, "Contests list", contests));
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = ContestController;
