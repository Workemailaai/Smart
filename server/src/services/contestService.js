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
const {
  weightedTotalsForJury,
  sortCriteriaRows,
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
    completed: "completed",
    archived: "archived"
  };

  static getExpectedScoreCount(criteriaCount, participantsCount) {
    return criteriaCount * participantsCount;
  }

  static countSubmittedJury({ scoreCountByJuryId, juryMembers, expectedScoreCount }) {
    if (expectedScoreCount === 0 || juryMembers.length === 0) {
      return 0;
    }
    let submitted = 0;
    for (const member of juryMembers) {
      const key = String(member.id);
      const count = Number(scoreCountByJuryId[key] || 0);
      if (count >= expectedScoreCount) submitted += 1;
    }
    return submitted;
  }

  /**
   * Удаление мероприятия организатором (только этап оценивания).
   */
  static async deleteContestByOrganizer({ contestId, userId }) {
    const contest = await Contest.findByPk(contestId);
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
    try {
      await JuryParticipantComment.destroy({ where: { contestId }, transaction: t });
      await Score.destroy({ where: { contestId }, transaction: t });
      await Jury.destroy({ where: { contestId }, transaction: t });
      await Participant.destroy({ where: { contestId }, transaction: t });
      await Criterion.destroy({ where: { contestId }, transaction: t });
      await contest.destroy({ transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
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
        const juryMembers = await Jury.findAll({ where: { contestId: contest.id }, attributes: ["id"] });
        const expectedScoreCount = ContestService.getExpectedScoreCount(criteriaCount, participantsCount);
        const scoreCountByJuryId = await ContestService.getScoreCountByJury(contest.id);
        const submittedJuryCount = ContestService.countSubmittedJury({
          scoreCountByJuryId,
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
      const rows = await Jury.findAll({
        where: { userId: user.id },
        attributes: ["id", "contestId"]
      });
      const ids = [...new Set(rows.map((r) => r.contestId))];
      if (ids.length === 0) {
        return [];
      }
      const contests = await Contest.findAll({ where: { id: ids } });
      const byContestId = new Map(rows.map((item) => [item.contestId, item]));
      const result = [];
      for (const contest of contests) {
        const myAssignment = byContestId.get(contest.id);
        const criteriaCount = await Criterion.count({ where: { contestId: contest.id } });
        const participantsCount = await Participant.count({ where: { contestId: contest.id } });
        const expectedScoreCount = ContestService.getExpectedScoreCount(criteriaCount, participantsCount);
        const myScoreCount = myAssignment
          ? await Score.count({ where: { contestId: contest.id, juryId: myAssignment.id } })
          : 0;
        result.push({
          ...contest.get({ plain: true }),
          mySubmitted: expectedScoreCount > 0 && myScoreCount >= expectedScoreCount
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
      const criteriaSorted = sortCriteriaRows(contest.criteria);
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
    const mySubmitted = expectedScoreCount > 0 && myScores.length >= expectedScoreCount;

    return {
      contest: contest.get({ plain: true }),
      criteria: contest.criteria,
      participants: contest.participants,
      myScores,
      myComments,
      averageByParticipant,
      mySubmitted
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

    const scoreCountByJuryId = await ContestService.getScoreCountByJury(contestId);
    const submittedJuryCount = ContestService.countSubmittedJury({
      scoreCountByJuryId,
      juryMembers: contest.juryMembers,
      expectedScoreCount
    });

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

    const criteriaSorted = sortCriteriaRows(contest.criteria);
    const participantsSorted = sortParticipantsRows(contest.participants);
    const useWeights = Boolean(contest.useCriteriaWeights);

    let participants;
    if (useWeights && contest.criteria.length > 0) {
      const perJuryTotals = {};
      for (const jm of contest.juryMembers) {
        perJuryTotals[jm.id] = weightedTotalsForJury({
          criteriaSorted,
          participantsSorted,
          getRawScore: (cId, pId) => scoreMap.get(`${jm.id}_${pId}_${cId}`)
        });
      }
      participants = participantsSorted.map((participant, idx) => {
        const juryCards = contest.juryMembers.map((juryMember) => {
          const criteria = criteriaSorted.map((criterion) => {
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
            fullName: juryMember.user?.fullName || "Жюри",
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
            fullName: juryMember.user?.fullName || "Жюри",
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
    const scoreCountByJuryId = await ContestService.getScoreCountByJury(contestId);
    const submittedJuryCount = ContestService.countSubmittedJury({
      scoreCountByJuryId,
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
        contest.status !== ContestService.contestStatuses.completed &&
        contest.status !== ContestService.contestStatuses.archived
      ) {
        throw new ApiError(422, "Результаты доступны после завершения мероприятия");
      }
    } else if (user.role === "jury") {
      const assignment = contest.juryMembers.find((item) => item.userId === user.id);
      if (!assignment) {
        throw new ApiError(403, "Это мероприятие недоступно для данного жюри");
      }
      if (contest.status !== ContestService.contestStatuses.archived) {
        throw new ApiError(422, "Жюри может смотреть результаты только в архиве");
      }
    } else {
      throw new ApiError(403, "Недостаточно прав для просмотра результатов");
    }

    const scores = await Score.findAll({ where: { contestId } });
    const criteriaSorted = sortCriteriaRows(contest.criteria);
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
        perJuryTotals[jm.id] = weightedTotalsForJury({
          criteriaSorted,
          participantsSorted,
          getRawScore: (cId, pId) => scoreMap.get(`${jm.id}_${pId}_${cId}`)
        });
      }
      ranked = participantsSorted
        .map((participant, idx) => {
          const vals = contest.juryMembers.map((jm) => perJuryTotals[jm.id][idx] ?? 0);
          const average = vals.length
            ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2))
            : 0;
          return {
            participantId: participant.id,
            fullName: participant.fullName,
            extraInfo: participant.extraInfo,
            country: participant.country,
            photoUrl: participant.photoUrl,
            score: average,
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
            score: average,
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
        status: contest.status
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
    const { title, description, contestType, criteria, participants, jury, useCriteriaWeights } = payload;
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
    }
    const useW = Boolean(useCriteriaWeights);
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
      useCriteriaWeights: useW
    };
  }

  /**
   * Атомарное создание мероприятия с критериями, участниками, жюри и файлами.
   * @param {object} params
   * @param {Record<string, Express.Multer.File>} params.filesByField
   */
  static async createContestFull({ organizerId, payload, filesByField }) {
    const normalized = ContestService.assertCreateFullPayload(payload);
    const { title, description, contestType, criteria, participants, jury, useCriteriaWeights } = normalized;

    const coverFile = filesByField.cover;
    const coverImageUrl = coverFile ? `/media/contests/${coverFile.filename}` : null;

    const t = await sequelize.transaction();
    try {
      const contest = await Contest.create(
        {
          title,
          description,
          organizerId,
          contestType,
          coverImageUrl,
          useCriteriaWeights
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
        const photoUrl = f ? `/media/participants/${f.filename}` : null;
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
        const photoUrl = f ? `/media/jury/${f.filename}` : null;
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
