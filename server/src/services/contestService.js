const { Contest, Jury } = require("../db/models");
const ApiError = require("../utils/ApiError");

class ContestService {
  /** Создание конкурса */
  static async createContest({ title, description, organizerId }) {
    const contest = await Contest.create({ title, description, organizerId });
    return contest;
  }

  /** Список конкурсов для организатора или жюри */
  static async listContests(user) {
    if (user.role === "organizer") {
      return Contest.findAll({ where: { organizerId: user.id } });
    }
    if (user.role === "jury") {
      const rows = await Jury.findAll({
        where: { userId: user.id },
        attributes: ["contestId"]
      });
      const ids = [...new Set(rows.map((r) => r.contestId))];
      if (ids.length === 0) {
        return [];
      }
      return Contest.findAll({ where: { id: ids } });
    }
    return [];
  }

  /** Конкурс по id или 404 */
  static async getContestById(id) {
    const contest = await Contest.findByPk(id);
    if (!contest) throw new ApiError(404, "Contest not found");
    return contest;
  }
}

module.exports = ContestService;
