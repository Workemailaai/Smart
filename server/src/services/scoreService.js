const { sequelize, Contest, Criterion, Jury, Participant, Score, JuryParticipantComment } = require("../db/models");
const ApiError = require("../utils/ApiError");
const MAX_COMMENT_LENGTH = 500;

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

  static async assertCommentPayload({ contestId, participantId, comment }) {
    const participant = await Participant.findByPk(participantId);
    if (!participant || participant.contestId !== Number(contestId)) {
      throw new ApiError(400, "Участник не относится к этому мероприятию");
    }

    if (typeof comment !== "string") {
      throw new ApiError(400, "Комментарий должен быть строкой");
    }

    if (comment.length > MAX_COMMENT_LENGTH) {
      throw new ApiError(400, `Комментарий не должен превышать ${MAX_COMMENT_LENGTH} символов`);
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
  static async putScoresBatch({ userId, contestId, scores, comments = [] }) {
    if (!Array.isArray(scores) || scores.length === 0) {
      throw new ApiError(422, "Передайте непустой массив оценок");
    }
    if (!Array.isArray(comments)) {
      throw new ApiError(422, "Поле comments должно быть массивом");
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
      for (const item of comments) {
        await ScoreService.assertCommentPayload({
          contestId,
          participantId: item.participantId,
          comment: item.comment
        });
        await JuryParticipantComment.upsert(
          {
            contestId,
            juryId: jury.id,
            participantId: item.participantId,
            comment: item.comment
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
