const fs = require("fs");
const { sequelize, Contest, Jury, Criterion, Participant, User } = require("../db/models");
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
  /** Создание конкурса */
  static async createContest({ title, description, organizerId, contestType, coverImageUrl }) {
    const contest = await Contest.create({
      title,
      description,
      organizerId,
      contestType: contestType || "miss_world",
      coverImageUrl: coverImageUrl || null
    });
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
