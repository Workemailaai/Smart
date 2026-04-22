const fs = require("fs");
const {
  sequelize,
  Contest,
  Jury,
  Criterion,
  Participant,
  Score,
  JuryParticipantComment,
  User
} = require("../db/models");
const ApiError = require("../utils/ApiError");
const { CONTEST_TYPES } = require("../constants/contestTypes");
const JuryService = require("./juryService");
const MediaFileService = require("./mediaFileService");
const {
  weightedTotalsForJury,
  orderCriteriaForJury,
  sortParticipantsRows
} = require("./weightedScores");

function unlinkUploadedFiles(filesByField) {
  const files = Object.values(filesByField || {}).filter(Boolean);
  for (const f of files) {
    try {
      if (f.path && fs.existsSync(f.path)) {
        fs.unlinkSync(f.path);
      }
    } catch (err) {
      console.error("[Конкурс] Удаление файла после ошибки:", err?.message || err);
    }
  }
}

class ContestService {
  static contestStatuses = {
    inProgress: "in_progress",
    judgingCompleted: "judging_completed",
    completed: "completed"
  };

  static getExpectedScoreCount(criteriaCount, participantsCount) {
    return criteriaCount * participantsCount;
  }

  static normalizeFiniteNumber(value, fallback = 0) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
  }

  static countSubmittedJury({ juryMembers, expectedScoreCount }) {
    if (expectedScoreCount === 0 || juryMembers.length === 0) {
      return 0;
    }
    return juryMembers.filter((member) => Boolean(member.isSubmitted)).length;
  }

  /**
   * Удаление мероприятия организатором (только этап оценивания).
   */
  static async deleteContestByOrganizer({ contestId, userId }) {
    const contest = await ContestService.getContestWithDependencies(contestId);
    if (!contest) {
      throw new ApiError(404, "Мероприятие не найдено");
    }
    if (contest.organizerId !== userId) {
      throw new ApiError(403, "Нет доступа к этому мероприятию");
    }
    const deletable = [
      ContestService.contestStatuses.inProgress,
      ContestService.contestStatuses.judgingCompleted,
      ContestService.contestStatuses.completed
    ];
    if (!deletable.includes(contest.status)) {
      throw new ApiError(
        400,
        "Удаление недоступно для этого мероприятия"
      );
    }

    const t = await sequelize.transaction();
    let removableMediaPaths = [];
    try {
      const mediaPaths = MediaFileService.collectContestMediaPaths({
        contest,
        participants: contest.participants,
        juryMembers: contest.juryMembers
      });
      await JuryParticipantComment.destroy({ where: { contestId }, transaction: t });
      await Score.destroy({ where: { contestId }, transaction: t });
      await Jury.destroy({ where: { contestId }, transaction: t });
      await Participant.destroy({ where: { contestId }, transaction: t });
      await Criterion.destroy({ where: { contestId }, transaction: t });
      await contest.destroy({ transaction: t });
      removableMediaPaths = await MediaFileService.decrementReferences(mediaPaths, t);
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
    MediaFileService.cleanupFiles(removableMediaPaths);
  }

  static async getContestWithDependencies(contestId) {
    const contest = await Contest.findByPk(contestId, {
      include: [
        {
          model: Criterion,
          as: "criteria",
          separate: true,
          order: [
            ["sortOrder", "ASC"],
            ["id", "ASC"]
          ]
        },
        {
          model: Participant,
          as: "participants",
          separate: true,
          order: [["id", "ASC"]]
        },
        {
          model: Jury,
          as: "juryMembers",
          include: [{ model: User, as: "user", attributes: ["id", "fullName", "phone", "role"] }]
        }
      ]
    });
    if (!contest) {
      throw new ApiError(404, "Мероприятие не найдено");
    }
    return contest;
  }

  static async getScoreCountByJury(contestId) {
    const rows = await Score.findAll({
      where: { contestId },
      attributes: [
        "juryId",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"]
      ],
      group: ["juryId"],
      raw: true
    });
    return rows.reduce((acc, row) => {
      acc[String(row.juryId)] = Number(row.count || 0);
      return acc;
    }, {});
  }

  /** Создание конкурса */
  static async createContest({ title, description, organizerId, contestType, coverImageUrl }) {
    const contest = await Contest.create({
      title,
      description,
      organizerId,
      contestType: contestType || "creative",
      coverImageUrl: coverImageUrl || null,
      status: ContestService.contestStatuses.inProgress
    });
    return contest;
  }

  /** Список конкурсов для организатора или жюри */
  static async listContests(user) {
    if (user.role === "organizer") {
      const contests = await Contest.findAll({ where: { organizerId: user.id } });
      const result = [];
      for (const contest of contests) {
        const criteriaCount = await Criterion.count({ where: { contestId: contest.id } });
        const participantsCount = await Participant.count({ where: { contestId: contest.id } });
        const juryMembers = await Jury.findAll({
          where: { contestId: contest.id },
          attributes: ["id", "isSubmitted"]
        });
        const expectedScoreCount = ContestService.getExpectedScoreCount(criteriaCount, participantsCount);
        const submittedJuryCount = ContestService.countSubmittedJury({
          juryMembers,
          expectedScoreCount
        });
        result.push({
          ...contest.get({ plain: true }),
          submittedJuryCount,
          totalJuryCount: juryMembers.length
        });
      }
      return result;
    }
    if (user.role === "jury") {
      const assignments = await Jury.findAll({
        where: { userId: user.id },
        attributes: ["id", "contestId", "isSubmitted"]
      });
      const ids = [...new Set(assignments.map((row) => row.contestId))];
      if (ids.length === 0) {
        return [];
      }
      const contests = await Contest.findAll({ where: { id: ids } });
      const assignmentByContestId = new Map(assignments.map((assignment) => [assignment.contestId, assignment]));
      const result = [];
      for (const contest of contests) {
        const myAssignment = assignmentByContestId.get(contest.id);
        const criteriaCount = await Criterion.count({ where: { contestId: contest.id } });
        const participantsCount = await Participant.count({ where: { contestId: contest.id } });
        const juryMembers = await Jury.findAll({
          where: { contestId: contest.id },
          attributes: ["id", "isSubmitted"]
        });
        const expectedScoreCount = ContestService.getExpectedScoreCount(criteriaCount, participantsCount);
        const submittedJuryCount = ContestService.countSubmittedJury({
          juryMembers,
          expectedScoreCount
        });
        result.push({
          ...contest.get({ plain: true }),
          mySubmitted: Boolean(myAssignment?.isSubmitted),
          submittedJuryCount,
          totalJuryCount: juryMembers.length
        });
      }
      return result;
    }
    return [];
  }

  static async getJuryContestView({ contestId, userId }) {
    const contest = await ContestService.getContestWithDependencies(contestId);
    const myAssignment = contest.juryMembers.find((item) => item.userId === userId);
    if (!myAssignment) {
      throw new ApiError(403, "Это мероприятие недоступно для данного жюри");
    }

    const myScores = await Score.findAll({
      where: { contestId, juryId: myAssignment.id },
      attributes: ["participantId", "criterionId", "value"]
    });
    const myComments = await JuryParticipantComment.findAll({
      where: { contestId, juryId: myAssignment.id },
      attributes: ["participantId", "comment"]
    });
    const criteriaCount = contest.criteria.length;
    const useWeights = Boolean(contest.useCriteriaWeights);

    let averageByParticipant;
    if (useWeights && criteriaCount > 0) {
      const criteriaSorted = orderCriteriaForJury(contest.criteria, myAssignment.criterionOrder);
      const participantsSorted = sortParticipantsRows(contest.participants);
      const myScoreMap = new Map();
      for (const s of myScores) {
        myScoreMap.set(`${s.participantId}_${s.criterionId}`, Number(s.value));
      }
      const totals = weightedTotalsForJury({
        criteriaSorted,
        participantsSorted,
        getRawScore: (criterionId, participantId) =>
          myScoreMap.get(`${participantId}_${criterionId}`)
      });
      averageByParticipant = participantsSorted.map((participant, idx) => ({
        participantId: participant.id,
        average: totals[idx] ?? 0
      }));
    } else {
      const participantTotals = {};
      for (const score of myScores) {
        const key = String(score.participantId);
        participantTotals[key] = Number(participantTotals[key] || 0) + Number(score.value || 0);
      }
      averageByParticipant = contest.participants.map((participant) => {
        const sum = Number(participantTotals[String(participant.id)] || 0);
        return {
          participantId: participant.id,
          average: criteriaCount > 0 ? Number((sum / criteriaCount).toFixed(2)) : 0
        };
      });
    }

    const expectedScoreCount = ContestService.getExpectedScoreCount(
      contest.criteria.length,
      contest.participants.length
    );
    const mySubmitted = Boolean(myAssignment.isSubmitted);

    const criteriaForResponse = orderCriteriaForJury(contest.criteria, myAssignment.criterionOrder);
    const criteriaPlain = criteriaForResponse.map((c) => c.get({ plain: true }));
    const myCriterionOrder = criteriaForResponse.map((c) => c.id);

    return {
      contest: contest.get({ plain: true }),
      criteria: criteriaPlain,
      myCriterionOrder,
      participants: contest.participants,
      myScores,
      myComments,
      averageByParticipant,
      mySubmitted
    };
  }

  /**
   * Жюри сохраняет индивидуальный порядок показателей (поле jury.criterionOrder).
   * @param {number[]} orderedCriterionIds — полный список id критериев конкурса в новом порядке
   */
  static async reorderCriteriaByJury({ contestId, userId, orderedCriterionIds }) {
    const contest = await ContestService.getContestWithDependencies(contestId);
    const myAssignment = contest.juryMembers.find((item) => item.userId === userId);
    if (!myAssignment) {
      throw new ApiError(403, "Это мероприятие недоступно для данного жюри");
    }
    if (!contest.juryPreferencesEnabled) {
      throw new ApiError(403, "Изменение порядка показателей для жюри отключено");
    }
    if (!contest.useCriteriaWeights) {
      throw new ApiError(403, "Порядок показателей доступен только при включённой значимости");
    }
    const rows = contest.criteria || [];
    if (rows.length < 2) {
      throw new ApiError(422, "Недостаточно показателей для перестановки");
    }
    if (!Array.isArray(orderedCriterionIds) || orderedCriterionIds.length !== rows.length) {
      throw new ApiError(422, "Передайте полный список id критериев");
    }
    const idSet = new Set(rows.map((c) => c.id));
    const seen = new Set();
    for (const raw of orderedCriterionIds) {
      const id = Number(raw);
      if (!Number.isInteger(id) || !idSet.has(id) || seen.has(id)) {
        throw new ApiError(422, "Некорректный список критериев");
      }
      seen.add(id);
    }
    if (seen.size !== idSet.size) {
      throw new ApiError(422, "Некорректный список критериев");
    }

    await Jury.update(
      { criterionOrder: orderedCriterionIds.map((x) => Number(x)) },
      { where: { id: myAssignment.id, contestId } }
    );

    const fresh = await ContestService.getContestWithDependencies(contestId);
    const me = fresh.juryMembers.find((j) => j.userId === userId);
    const criteriaOrdered = orderCriteriaForJury(fresh.criteria, me?.criterionOrder);
    return {
      criteria: criteriaOrdered.map((c) => c.get({ plain: true })),
      myCriterionOrder: criteriaOrdered.map((c) => c.id)
    };
  }

  static async submitJuryScores({ contestId, userId }) {
    const contest = await ContestService.getContestWithDependencies(contestId);
    const myAssignment = contest.juryMembers.find((item) => item.userId === userId);
    if (!myAssignment) {
      throw new ApiError(403, "Это мероприятие недоступно для данного жюри");
    }

    const expectedScoreCount = ContestService.getExpectedScoreCount(
      contest.criteria.length,
      contest.participants.length
    );
    if (expectedScoreCount === 0) {
      throw new ApiError(422, "Невозможно отправить оценки: нет критериев или участников");
    }
    const myScoreCount = await Score.count({
      where: { contestId, juryId: myAssignment.id }
    });
    if (myScoreCount < expectedScoreCount) {
      throw new ApiError(422, "Заполните оценки по всем критериям для каждого участника");
    }

    const previousSubmittedJuryIds = new Set(
      contest.juryMembers
        .filter((juryMember) => Boolean(juryMember.isSubmitted))
        .map((juryMember) => Number(juryMember.id))
    );
    previousSubmittedJuryIds.add(Number(myAssignment.id));
    const submittedJuryCount = previousSubmittedJuryIds.size;
    await myAssignment.update({ isSubmitted: true });

    if (
      contest.juryMembers.length > 0 &&
      submittedJuryCount >= contest.juryMembers.length &&
      contest.status === ContestService.contestStatuses.inProgress
    ) {
      await contest.update({ status: ContestService.contestStatuses.judgingCompleted });
    }

    return {
      submittedJuryCount,
      totalJuryCount: contest.juryMembers.length,
      status:
        submittedJuryCount >= contest.juryMembers.length
          ? ContestService.contestStatuses.judgingCompleted
          : ContestService.contestStatuses.inProgress
    };
  }

  /** Жюри снимает отправку оценок, чтобы скорректировать значения и отправить повторно. */
  static async revokeJurySubmission({ contestId, userId }) {
    const contest = await ContestService.getContestWithDependencies(contestId);
    const myAssignment = contest.juryMembers.find((item) => item.userId === userId);
    if (!myAssignment) {
      throw new ApiError(403, "Это мероприятие недоступно для данного жюри");
    }
    if (contest.status === ContestService.contestStatuses.completed) {
      throw new ApiError(422, "Нельзя переголосовать после завершения мероприятия");
    }

    if (!myAssignment.isSubmitted) {
      return {
        submittedJuryCount: contest.juryMembers.filter((juryMember) => Boolean(juryMember.isSubmitted)).length,
        totalJuryCount: contest.juryMembers.length,
        status: contest.status
      };
    }

    await myAssignment.update({ isSubmitted: false });
    const submittedJuryCount = contest.juryMembers.filter(
      (juryMember) => Boolean(juryMember.isSubmitted) && juryMember.id !== myAssignment.id
    ).length;

    if (contest.status === ContestService.contestStatuses.judgingCompleted) {
      await contest.update({ status: ContestService.contestStatuses.inProgress });
    }

    return {
      submittedJuryCount,
      totalJuryCount: contest.juryMembers.length,
      status: ContestService.contestStatuses.inProgress
    };
  }

  static async getOrganizerContestView({ contestId, userId }) {
    const contest = await ContestService.getContestWithDependencies(contestId);
    if (contest.organizerId !== userId) {
      throw new ApiError(403, "Только организатор может просматривать этот раздел");
    }

    const scores = await Score.findAll({ where: { contestId } });
    const comments = await JuryParticipantComment.findAll({
      where: { contestId },
      attributes: ["juryId", "participantId", "comment"]
    });
    const scoreMap = new Map();
    for (const row of scores) {
      scoreMap.set(`${row.juryId}_${row.participantId}_${row.criterionId}`, Number(row.value));
    }
    const commentMap = new Map();
    for (const row of comments) {
      commentMap.set(`${row.juryId}_${row.participantId}`, String(row.comment || ""));
    }

    const participantsSorted = sortParticipantsRows(contest.participants);
    const useWeights = Boolean(contest.useCriteriaWeights);

    let participants;
    if (useWeights && contest.criteria.length > 0) {
      const perJuryTotals = {};
      for (const jm of contest.juryMembers) {
        const criteriaSortedForJury = orderCriteriaForJury(contest.criteria, jm.criterionOrder);
        perJuryTotals[jm.id] = weightedTotalsForJury({
          criteriaSorted: criteriaSortedForJury,
          participantsSorted,
          getRawScore: (cId, pId) => scoreMap.get(`${jm.id}_${pId}_${cId}`)
        });
      }
      participants = participantsSorted.map((participant, idx) => {
        const juryCards = contest.juryMembers.map((juryMember) => {
          const criteria = contest.criteria.map((criterion) => {
            const value =
              scoreMap.get(`${juryMember.id}_${participant.id}_${criterion.id}`) ?? null;
            return {
              criterionId: criterion.id,
              name: criterion.name,
              minScore: criterion.minScore ?? 0,
              maxScore: criterion.maxScore,
              value
            };
          });
          const wt = perJuryTotals[juryMember.id][idx] ?? 0;
          return {
            juryId: juryMember.id,
            userId: juryMember.userId,
            fullName: juryMember.displayName || juryMember.user?.fullName || "Жюри",
            phone: juryMember.user?.phone || "",
            position: juryMember.position,
            photoUrl: juryMember.photoUrl,
            comment: commentMap.get(`${juryMember.id}_${participant.id}`) || "",
            criteria,
            total: wt
          };
        });
        const vals = contest.juryMembers.map((jm) => perJuryTotals[jm.id][idx] ?? 0);
        const overallAverage = vals.length
          ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
          : 0;
        const overallTotal = Number(vals.reduce((a, b) => a + b, 0).toFixed(2));
        return {
          id: participant.id,
          fullName: participant.fullName,
          extraInfo: participant.extraInfo,
          country: participant.country,
          photoUrl: participant.photoUrl,
          juryCards,
          overallTotal,
          overallAverage
        };
      });
    } else {
      participants = contest.participants.map((participant) => {
        let participantSum = 0;
        let participantCount = 0;
        const juryCards = contest.juryMembers.map((juryMember) => {
          let juryTotal = 0;
          let juryCount = 0;
          const criteriaRows = contest.criteria.map((criterion) => {
            const value =
              scoreMap.get(`${juryMember.id}_${participant.id}_${criterion.id}`) ?? null;
            if (typeof value === "number") {
              juryTotal += value;
              juryCount += 1;
              participantSum += value;
              participantCount += 1;
            }
            return {
              criterionId: criterion.id,
              name: criterion.name,
              minScore: criterion.minScore ?? 0,
              maxScore: criterion.maxScore,
              value
            };
          });
          return {
            juryId: juryMember.id,
            userId: juryMember.userId,
            fullName: juryMember.displayName || juryMember.user?.fullName || "Жюри",
            phone: juryMember.user?.phone || "",
            position: juryMember.position,
            photoUrl: juryMember.photoUrl,
            comment: commentMap.get(`${juryMember.id}_${participant.id}`) || "",
            criteria: criteriaRows,
            total: juryCount > 0 ? Number((juryTotal / juryCount).toFixed(2)) : 0
          };
        });

        return {
          id: participant.id,
          fullName: participant.fullName,
          extraInfo: participant.extraInfo,
          country: participant.country,
          photoUrl: participant.photoUrl,
          juryCards,
          overallTotal: participantCount > 0 ? Number(participantSum.toFixed(2)) : 0,
          overallAverage: participantCount > 0 ? Number((participantSum / participantCount).toFixed(2)) : 0
        };
      });
    }

    const expectedScoreCount = ContestService.getExpectedScoreCount(
      contest.criteria.length,
      contest.participants.length
    );
    const submittedJuryCount = ContestService.countSubmittedJury({
      juryMembers: contest.juryMembers,
      expectedScoreCount
    });

    return {
      contest: contest.get({ plain: true }),
      participants,
      canComplete:
        contest.status === ContestService.contestStatuses.judgingCompleted &&
        contest.juryMembers.length > 0 &&
        submittedJuryCount >= contest.juryMembers.length,
      submittedJuryCount,
      totalJuryCount: contest.juryMembers.length
    };
  }

  static async getContestResultsView({ contestId, user }) {
    const contest = await ContestService.getContestWithDependencies(contestId);

    if (user.role === "organizer") {
      if (contest.organizerId !== user.id) {
        throw new ApiError(403, "Только организатор может просматривать результаты этого мероприятия");
      }
      if (
        contest.status !== ContestService.contestStatuses.completed
      ) {
        throw new ApiError(422, "Результаты доступны после завершения мероприятия");
      }
    } else if (user.role === "jury") {
      const assignment = contest.juryMembers.find((item) => item.userId === user.id);
      if (!assignment) {
        throw new ApiError(403, "Это мероприятие недоступно для данного жюри");
      }
      if (contest.status !== ContestService.contestStatuses.completed) {
        throw new ApiError(422, "Жюри может смотреть результаты только после завершения мероприятия");
      }
    } else {
      throw new ApiError(403, "Недостаточно прав для просмотра результатов");
    }

    const scores = await Score.findAll({ where: { contestId } });
    const participantsSorted = sortParticipantsRows(contest.participants);
    const useWeights = Boolean(contest.useCriteriaWeights);

    let ranked;
    if (useWeights && contest.criteria.length > 0) {
      const scoreMap = new Map();
      for (const row of scores) {
        scoreMap.set(`${row.juryId}_${row.participantId}_${row.criterionId}`, Number(row.value));
      }
      const perJuryTotals = {};
      for (const jm of contest.juryMembers) {
        const criteriaSortedForJury = orderCriteriaForJury(contest.criteria, jm.criterionOrder);
        perJuryTotals[jm.id] = weightedTotalsForJury({
          criteriaSorted: criteriaSortedForJury,
          participantsSorted,
          getRawScore: (cId, pId) => scoreMap.get(`${jm.id}_${pId}_${cId}`)
        });
      }
      ranked = participantsSorted
        .map((participant, idx) => {
          const vals = contest.juryMembers.map((jm) =>
            ContestService.normalizeFiniteNumber(perJuryTotals[jm.id]?.[idx], 0)
          );
          const sum = vals.reduce((acc, current) => acc + current, 0);
          const average = vals.length
            ? Number((sum / vals.length).toFixed(2))
            : 0;
          return {
            participantId: participant.id,
            fullName: participant.fullName,
            extraInfo: participant.extraInfo,
            country: participant.country,
            photoUrl: participant.photoUrl,
            score: ContestService.normalizeFiniteNumber(average, 0),
            place: 0
          };
        })
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.participantId - b.participantId;
        });
    } else {
      const valuesByParticipantId = new Map();
      for (const score of scores) {
        const participantId = Number(score.participantId);
        const value = Number(score.value);
        if (!Number.isFinite(value)) continue;
        const list = valuesByParticipantId.get(participantId) || [];
        list.push(value);
        valuesByParticipantId.set(participantId, list);
      }

      ranked = contest.participants
        .map((participant) => {
          const values = valuesByParticipantId.get(participant.id) || [];
          const sum = values.reduce((acc, current) => acc + current, 0);
          const average = values.length > 0 ? Number((sum / values.length).toFixed(2)) : 0;
          return {
            participantId: participant.id,
            fullName: participant.fullName,
            extraInfo: participant.extraInfo,
            country: participant.country,
            photoUrl: participant.photoUrl,
            score: ContestService.normalizeFiniteNumber(average, 0),
            place: 0
          };
        })
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.participantId - b.participantId;
        });
    }

    let previousScore = null;
    let previousPlace = 0;
    const withPlaces = ranked.map((item, index) => {
      const currentPlace =
        previousScore !== null && item.score === previousScore ? previousPlace : index + 1;
      previousScore = item.score;
      previousPlace = currentPlace;
      return { ...item, place: currentPlace };
    });

    return {
      contest: {
        id: contest.id,
        title: contest.title,
        coverImageUrl: contest.coverImageUrl,
        status: contest.status,
        createdAt: contest.createdAt,
        updatedAt: contest.updatedAt
      },
      topThree: withPlaces.slice(0, 3),
      others: withPlaces.slice(3)
    };
  }

  static async completeContestByOrganizer({ contestId, userId }) {
    const contest = await ContestService.getContestWithDependencies(contestId);
    if (contest.organizerId !== userId) {
      throw new ApiError(403, "Только организатор может завершить мероприятие");
    }
    if (contest.status !== ContestService.contestStatuses.judgingCompleted) {
      throw new ApiError(422, "Мероприятие нельзя завершить до полной сдачи оценок жюри");
    }
    await contest.update({
      status: ContestService.contestStatuses.completed,
      completedAt: new Date()
    });
    return contest;
  }

  /** Конкурс по id или 404 */
  static async getContestById(id) {
    const contest = await Contest.findByPk(id);
    if (!contest) throw new ApiError(404, "Contest not found");
    return contest;
  }

  /** Валидация тела создания мероприятия из конструктора */
  static assertCreateFullPayload(payload) {
    if (!payload || typeof payload !== "object") {
      throw new ApiError(400, "Некорректный JSON в поле payload");
    }
    const {
      title,
      description,
      contestType,
      criteria,
      participants,
      jury,
      coverImageUrl,
      useCriteriaWeights,
      juryPreferencesEnabled
    } = payload;
    const titleTrim = title != null ? String(title).trim() : "";
    if (!titleTrim) {
      throw new ApiError(422, "Укажите название мероприятия");
    }
    if (!contestType || !CONTEST_TYPES.includes(String(contestType))) {
      throw new ApiError(422, "Некорректный тип конкурса");
    }
    if (!Array.isArray(criteria) || criteria.length === 0) {
      throw new ApiError(422, "Добавьте хотя бы один критерий оценки");
    }
    for (const c of criteria) {
      const name = c?.name != null ? String(c.name).trim() : "";
      const minScore = c?.minScore != null ? Number(c.minScore) : 0;
      const maxScore = Number(c?.maxScore);
      if (!name) {
        throw new ApiError(422, "У каждого критерия должно быть название");
      }
      if (!Number.isInteger(minScore) || minScore < 0) {
        throw new ApiError(422, "Нижняя граница критерия — целое число не меньше 0");
      }
      if (!Number.isInteger(maxScore) || maxScore < 1) {
        throw new ApiError(422, "Верхняя граница критерия — целое число не меньше 1");
      }
      if (maxScore <= minScore) {
        throw new ApiError(422, "Верхняя граница должна быть больше нижней");
      }
    }
    if (!Array.isArray(participants)) {
      throw new ApiError(422, "Список участников должен быть массивом");
    }
    for (const p of participants) {
      const fn = p?.fullName != null ? String(p.fullName).trim() : "";
      if (!fn) {
        throw new ApiError(422, "У каждого участника укажите ФИО");
      }
      if (p?.photoUrl != null && String(p.photoUrl).trim() !== "") {
        const participantPhotoUrl = String(p.photoUrl).trim();
        if (!participantPhotoUrl.startsWith("/media/")) {
          throw new ApiError(422, "Некорректная ссылка на фото участника");
        }
      }
    }
    if (!Array.isArray(jury)) {
      throw new ApiError(422, "Список жюри должен быть массивом");
    }
    const phonesInPayload = new Set();
    for (const j of jury) {
      const fn = j?.fullName != null ? String(j.fullName).trim() : "";
      const phone = j?.phone != null ? String(j.phone).trim() : "";
      const pwd = j?.password != null ? String(j.password) : "";
      if (!fn) {
        throw new ApiError(422, "У каждого члена жюри укажите ФИО");
      }
      if (!phone) {
        throw new ApiError(422, "У каждого члена жюри укажите телефон");
      }
      if (!pwd || pwd.length < 6) {
        throw new ApiError(422, "Пароль жюри не короче 6 символов");
      }
      const norm = User.normalizePhone(phone);
      if (phonesInPayload.has(norm)) {
        throw new ApiError(422, "В заявке жюри номер телефона повторяется");
      }
      phonesInPayload.add(norm);
      if (j?.photoUrl != null && String(j.photoUrl).trim() !== "") {
        const juryPhotoUrl = String(j.photoUrl).trim();
        if (!juryPhotoUrl.startsWith("/media/")) {
          throw new ApiError(422, "Некорректная ссылка на фото жюри");
        }
      }
    }
    const normalizedCoverImageUrl =
      coverImageUrl != null && String(coverImageUrl).trim() !== ""
        ? String(coverImageUrl).trim()
        : null;
    if (normalizedCoverImageUrl && !normalizedCoverImageUrl.startsWith("/media/")) {
      throw new ApiError(422, "Некорректная ссылка на обложку мероприятия");
    }
    const useW = Boolean(useCriteriaWeights);
    const juryPref = Boolean(juryPreferencesEnabled);
    if (juryPref && !useW) {
      throw new ApiError(
        422,
        "Предпочтения жюри доступны только при включённой значимости показателей"
      );
    }
    return {
      title: titleTrim,
      description:
        description != null && String(description).trim() !== ""
          ? String(description).trim()
          : null,
      contestType: String(contestType),
      criteria,
      participants,
      jury,
      coverImageUrl: normalizedCoverImageUrl,
      useCriteriaWeights: useW,
      juryPreferencesEnabled: juryPref
    };
  }

  /**
   * Атомарное создание мероприятия с критериями, участниками, жюри и файлами.
   * @param {object} params
   * @param {Record<string, Express.Multer.File>} params.filesByField
   */
  static async createContestFull({ organizerId, payload, filesByField }) {
    const normalized = ContestService.assertCreateFullPayload(payload);
    const {
      title,
      description,
      contestType,
      criteria,
      participants,
      jury,
      coverImageUrl: coverImageUrlFromPayload,
      useCriteriaWeights,
      juryPreferencesEnabled
    } = normalized;

    const coverFile = filesByField.cover;
    const coverImageUrl = coverFile
      ? `/media/contests/${coverFile.filename}`
      : coverImageUrlFromPayload || null;

    const t = await sequelize.transaction();
    let removableMediaPaths = [];
    try {
      const contest = await Contest.create(
        {
          title,
          description,
          organizerId,
          contestType,
          coverImageUrl,
          useCriteriaWeights,
          juryPreferencesEnabled
        },
        { transaction: t }
      );

      for (let ci = 0; ci < criteria.length; ci++) {
        const c = criteria[ci];
        const name = String(c.name).trim();
        const minScore = c.minScore != null ? Number(c.minScore) : 0;
        const maxScore = Number(c.maxScore);
        await Criterion.create(
          { contestId: contest.id, name, minScore, maxScore, sortOrder: ci + 1 },
          { transaction: t }
        );
      }

      if (coverFile && !String(coverFile.mimetype || "").startsWith("image/")) {
        throw new ApiError(400, "Обложка должна быть изображением");
      }
      participants.forEach((_p, idx) => {
        const f = filesByField[`participantPhoto_${idx}`];
        if (f && !String(f.mimetype || "").startsWith("image/")) {
          throw new ApiError(400, `Файл участника ${idx + 1} должен быть изображением`);
        }
      });
      jury.forEach((_j, idx) => {
        const f = filesByField[`juryPhoto_${idx}`];
        if (f && !String(f.mimetype || "").startsWith("image/")) {
          throw new ApiError(400, `Файл жюри ${idx + 1} должен быть изображением`);
        }
      });

      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        const f = filesByField[`participantPhoto_${i}`];
        const fallbackParticipantPhotoUrl =
          p?.photoUrl != null && String(p.photoUrl).trim() !== ""
            ? String(p.photoUrl).trim()
            : null;
        const photoUrl = f ? `/media/participants/${f.filename}` : fallbackParticipantPhotoUrl;
        const countryTrim =
          p.country != null && String(p.country).trim() !== ""
            ? String(p.country).trim()
            : null;
        const extraInfoTrim =
          p.extraInfo != null && String(p.extraInfo).trim() !== ""
            ? String(p.extraInfo).trim()
            : null;
        await Participant.create(
          {
            contestId: contest.id,
            fullName: String(p.fullName).trim(),
            extraInfo: extraInfoTrim,
            country: countryTrim,
            photoUrl
          },
          { transaction: t }
        );
      }

      for (let i = 0; i < jury.length; i++) {
        const j = jury[i];
        const f = filesByField[`juryPhoto_${i}`];
        const fallbackJuryPhotoUrl =
          j?.photoUrl != null && String(j.photoUrl).trim() !== ""
            ? String(j.photoUrl).trim()
            : null;
        const photoUrl = f ? `/media/jury/${f.filename}` : fallbackJuryPhotoUrl;
        await JuryService.assignJuryToContest(
          {
            contestId: contest.id,
            organizerId,
            fullName: j.fullName,
            phone: j.phone,
            password: j.password,
            position: j.position,
            photoUrl
          },
          t
        );
      }

      const mediaPaths = MediaFileService.collectContestMediaPaths({
        contest: { coverImageUrl },
        participants: participants.map((participant, index) => {
          const participantPhotoFile = filesByField[`participantPhoto_${index}`];
          const fallbackParticipantPhotoUrl =
            participant?.photoUrl != null && String(participant.photoUrl).trim() !== ""
              ? String(participant.photoUrl).trim()
              : null;
          return {
            photoUrl: participantPhotoFile
              ? `/media/participants/${participantPhotoFile.filename}`
              : fallbackParticipantPhotoUrl
          };
        }),
        juryMembers: jury.map((juryMember, index) => {
          const juryPhotoFile = filesByField[`juryPhoto_${index}`];
          const fallbackJuryPhotoUrl =
            juryMember?.photoUrl != null && String(juryMember.photoUrl).trim() !== ""
              ? String(juryMember.photoUrl).trim()
              : null;
          return {
            photoUrl: juryPhotoFile ? `/media/jury/${juryPhotoFile.filename}` : fallbackJuryPhotoUrl
          };
        })
      });
      await MediaFileService.incrementReferences(mediaPaths, t);

      await t.commit();

      const full = await Contest.findByPk(contest.id, {
        include: [
          {
            model: Criterion,
            as: "criteria",
            separate: true,
            order: [
              ["sortOrder", "ASC"],
              ["id", "ASC"]
            ]
          },
          {
            model: Participant,
            as: "participants",
            separate: true,
            order: [["id", "ASC"]]
          },
          {
            model: Jury,
            as: "juryMembers",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "fullName", "phone", "role"]
              }
            ]
          }
        ]
      });
      return full;
    } catch (err) {
      await t.rollback();
      unlinkUploadedFiles(filesByField);
      throw err;
    }
  }
}

module.exports = ContestService;
