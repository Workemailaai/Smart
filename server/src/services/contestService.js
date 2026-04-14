const fs = require("fs");
const {
  sequelize,
  Contest,
  Jury,
  Criterion,
  Participant,
  Score,
  User
} = require("../db/models");
const ApiError = require("../utils/ApiError");
const { CONTEST_TYPES } = require("../constants/contestTypes");
const JuryService = require("./juryService");

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

  static async getContestWithDependencies(contestId) {
    const contest = await Contest.findByPk(contestId, {
      include: [
        { model: Criterion, as: "criteria" },
        { model: Participant, as: "participants" },
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
      contestType: contestType || "miss_world",
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
    const criteriaCount = contest.criteria.length;
    const participantTotals = {};
    for (const score of myScores) {
      const key = String(score.participantId);
      participantTotals[key] = Number(participantTotals[key] || 0) + Number(score.value || 0);
    }
    const averageByParticipant = contest.participants.map((participant) => {
      const sum = Number(participantTotals[String(participant.id)] || 0);
      return {
        participantId: participant.id,
        average: criteriaCount > 0 ? Number((sum / criteriaCount).toFixed(2)) : 0
      };
    });

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
    const scoreMap = new Map();
    for (const row of scores) {
      scoreMap.set(`${row.juryId}_${row.participantId}_${row.criterionId}`, Number(row.value));
    }

    const participants = contest.participants.map((participant) => {
      let participantSum = 0;
      let participantCount = 0;
      const juryCards = contest.juryMembers.map((juryMember) => {
        let juryTotal = 0;
        let juryCount = 0;
        const criteria = contest.criteria.map((criterion) => {
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
          criteria,
          total: juryCount > 0 ? Number((juryTotal / juryCount).toFixed(2)) : 0
        };
      });

      return {
        id: participant.id,
        fullName: participant.fullName,
        age: participant.age,
        country: participant.country,
        photoUrl: participant.photoUrl,
        juryCards,
        overallTotal: participantCount > 0 ? Number(participantSum.toFixed(2)) : 0,
        overallAverage: participantCount > 0 ? Number((participantSum / participantCount).toFixed(2)) : 0
      };
    });

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
    const { title, description, contestType, criteria, participants, jury } = payload;
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
      const maxScore = Number(c?.maxScore);
      if (!name) {
        throw new ApiError(422, "У каждого критерия должно быть название");
      }
      if (!Number.isInteger(maxScore) || maxScore < 1) {
        throw new ApiError(422, "Верхняя граница критерия — целое число не меньше 1");
      }
    }
    if (!Array.isArray(participants)) {
      throw new ApiError(422, "Список участников должен быть массивом");
    }
    for (const p of participants) {
      const fn = p?.fullName != null ? String(p.fullName).trim() : "";
      const age = Number(p?.age);
      if (!fn) {
        throw new ApiError(422, "У каждого участника укажите ФИО");
      }
      if (!Number.isInteger(age) || age < 1 || age > 150) {
        throw new ApiError(422, "Некорректный возраст участника");
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
    return {
      title: titleTrim,
      description:
        description != null && String(description).trim() !== ""
          ? String(description).trim()
          : null,
      contestType: String(contestType),
      criteria,
      participants,
      jury
    };
  }

  /**
   * Атомарное создание мероприятия с критериями, участниками, жюри и файлами.
   * @param {object} params
   * @param {Record<string, Express.Multer.File>} params.filesByField
   */
  static async createContestFull({ organizerId, payload, filesByField }) {
    const normalized = ContestService.assertCreateFullPayload(payload);
    const { title, description, contestType, criteria, participants, jury } = normalized;

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
          coverImageUrl
        },
        { transaction: t }
      );

      for (const c of criteria) {
        const name = String(c.name).trim();
        const maxScore = Number(c.maxScore);
        await Criterion.create(
          { contestId: contest.id, name, maxScore },
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
        await Participant.create(
          {
            contestId: contest.id,
            fullName: String(p.fullName).trim(),
            age: Number(p.age),
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
          { model: Criterion, as: "criteria" },
          { model: Participant, as: "participants" },
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
