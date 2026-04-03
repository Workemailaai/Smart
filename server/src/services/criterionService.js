const { Contest, Criterion } = require("../db/models");
const ApiError = require("../utils/ApiError");

class CriterionService {
  /** Создание критерия оценки */
  static async createCriterion({ contestId, organizerId, name, maxScore }) {
    const contest = await Contest.findByPk(contestId);
    if (!contest) throw new ApiError(404, "Contest not found");
    if (contest.organizerId !== organizerId) {
      throw new ApiError(403, "Only contest organizer can add criteria");
    }
    return Criterion.create({ contestId, name, maxScore: maxScore || 10 });
  }

  /** Критерии конкурса */
  static async listCriteria(contestId) {
    return Criterion.findAll({ where: { contestId } });
  }
}

module.exports = CriterionService;
