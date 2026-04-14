const { sequelize, Contest, Criterion, Jury, Participant, Score } = require("../db/models");
const ApiError = require("../utils/ApiError");

class ScoreService {
  static async resolveJuryAssignment({ contestId, userId }) {
    const contest = await Contest.findByPk(contestId);
    if (!contest) throw new ApiError(404, "Конкурс не найден");

    const jury = await Jury.findOne({ where: { contestId, userId } });
    if (!jury) {
      throw new ApiError(403, "Вы не назначены в жюри этого мероприятия");
    }
    return { contest, jury };
  }

  static async assertScorePayload({ contestId, participantId, criterionId, value }) {
    const participant = await Participant.findByPk(participantId);
    if (!participant || participant.contestId !== Number(contestId)) {
      throw new ApiError(400, "Участник не относится к этому мероприятию");
    }

    const criterion = await Criterion.findByPk(criterionId);
    if (!criterion || criterion.contestId !== Number(contestId)) {
      throw new ApiError(400, "Критерий не относится к этому мероприятию");
    }

    if (value < 0 || value > criterion.maxScore) {
      throw new ApiError(400, `Оценка должна быть в диапазоне от 0 до ${criterion.maxScore}`);
    }
  }

  /** Сохранение оценки членом жюри */
  static async putScore({ userId, contestId, participantId, criterionId, value }) {
    const { jury } = await ScoreService.resolveJuryAssignment({ contestId, userId });
    await ScoreService.assertScorePayload({ contestId, participantId, criterionId, value });

    const [score] = await Score.upsert(
      {
        contestId,
        juryId: jury.id,
        participantId,
        criterionId,
        value
      },
      { returning: true }
    );
    return score;
  }

  /** Пакетное сохранение оценок жюри */
  static async putScoresBatch({ userId, contestId, scores }) {
    if (!Array.isArray(scores) || scores.length === 0) {
      throw new ApiError(422, "Передайте непустой массив оценок");
    }

    const { jury } = await ScoreService.resolveJuryAssignment({ contestId, userId });
    const t = await sequelize.transaction();
    try {
      for (const item of scores) {
        await ScoreService.assertScorePayload({
          contestId,
          participantId: item.participantId,
          criterionId: item.criterionId,
          value: Number(item.value)
        });
        await Score.upsert(
          {
            contestId,
            juryId: jury.id,
            participantId: item.participantId,
            criterionId: item.criterionId,
            value: Number(item.value)
          },
          { transaction: t }
        );
      }
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }

    return Score.findAll({
      where: { contestId, juryId: jury.id }
    });
  }

  /** Все оценки конкурса */
  static async getContestScores(contestId) {
    return Score.findAll({ where: { contestId } });
  }
}

module.exports = ScoreService;
