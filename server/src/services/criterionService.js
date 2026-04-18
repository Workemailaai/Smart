const { Contest, Criterion } = require("../db/models");
const ApiError = require("../utils/ApiError");

class CriterionService {
  /** Создание критерия оценки */
  static async createCriterion({ contestId, organizerId, name, minScore, maxScore }) {
    const contest = await Contest.findByPk(contestId);
    if (!contest) throw new ApiError(404, "Contest not found");
    if (contest.organizerId !== organizerId) {
      throw new ApiError(403, "Only contest organizer can add criteria");
    }
    const min = minScore != null ? Number(minScore) : 0;
    const max = maxScore != null ? Number(maxScore) : 10;
    if (!Number.isInteger(min) || min < 0) {
      throw new ApiError(422, "Нижняя граница критерия — целое число не меньше 0");
    }
    if (!Number.isInteger(max) || max < 1) {
      throw new ApiError(422, "Верхняя граница критерия — целое число не меньше 1");
    }
    if (max <= min) {
      throw new ApiError(422, "Верхняя граница должна быть больше нижней");
    }
    return Criterion.create({ contestId, name, minScore: min, maxScore: max });
  }

  /** Критерии конкурса */
  static async listCriteria(contestId) {
    return Criterion.findAll({ where: { contestId } });
  }
}

module.exports = CriterionService;
