const { EventTemplate, sequelize } = require("../db/models");
const ApiError = require("../utils/ApiError");
const { CONTEST_TYPES } = require("../constants/contestTypes");
const MediaFileService = require("./mediaFileService");

class TemplateService {
  static buildDefaultCriteriaInequalities(criteriaCount) {
    if (!Number.isInteger(criteriaCount) || criteriaCount <= 1) return [];
    return Array.from({ length: criteriaCount - 1 }, () => "gt");
  }

  static normalizeCriteriaInequalities(rawOperators, criteriaCount) {
    const expectedLength = Math.max(0, criteriaCount - 1);
    if (rawOperators == null) {
      return TemplateService.buildDefaultCriteriaInequalities(criteriaCount);
    }
    if (!Array.isArray(rawOperators)) {
      throw new ApiError(400, "Цепочка неравенств должна быть массивом");
    }
    if (rawOperators.length !== expectedLength) {
      throw new ApiError(400, "Длина цепочки неравенств должна быть равна количеству критериев минус один");
    }
    const normalizedOperators = rawOperators.map((operator) => String(operator));
    for (const operator of normalizedOperators) {
      if (operator !== "gt" && operator !== "eq" && operator !== "gte") {
        throw new ApiError(400, "Допустимые операторы неравенств: gt, eq, gte");
      }
    }
    return normalizedOperators;
  }

  /**
   * Нормализует каркас шаблона: тип конкурса + критерии с верхней границей (нижняя всегда 1).
   * Поддерживает старый формат criteria как массив строк.
   */
  static normalizeSkeletonCriteria(criteria) {
    if (!Array.isArray(criteria) || criteria.length === 0) {
      throw new ApiError(
        400,
        "Передайте criteria как непустой массив объектов { name, maxScore } или строк (названия)"
      );
    }
    return criteria.map((c, idx) => {
      if (typeof c === "string") {
        const name = String(c).trim();
        if (!name) {
          throw new ApiError(400, `Пустое название критерия в позиции ${idx + 1}`);
        }
        return { name, minScore: 1, maxScore: 10 };
      }
      if (c && typeof c === "object") {
        const name = c.name != null ? String(c.name).trim() : "";
        const minScore = c.minScore != null ? Number(c.minScore) : 1;
        const maxScore = Number(c.maxScore);
        if (!name) {
          throw new ApiError(400, `Пустое название критерия в позиции ${idx + 1}`);
        }
        if (!Number.isInteger(minScore) || minScore < 0) {
          throw new ApiError(
            400,
            `Некорректная нижняя граница у критерия «${name}» (целое число ≥ 0)`
          );
        }
        if (!Number.isInteger(maxScore) || maxScore < 1) {
          throw new ApiError(
            400,
            `Некорректная верхняя граница у критерия «${name}» (целое число ≥ 1)`
          );
        }
        if (maxScore <= minScore) {
          throw new ApiError(400, `У критерия «${name}» верхняя граница должна быть больше нижней`);
        }
        return { name, minScore, maxScore };
      }
      throw new ApiError(400, "Некорректный элемент в criteria");
    });
  }

  static normalizeTemplateSnapshot(snapshot, fallbackContestType, fallbackCriteria) {
    const source = snapshot && typeof snapshot === "object" ? snapshot : {};
    const contestType = source.contestType != null ? String(source.contestType) : fallbackContestType;
    if (!CONTEST_TYPES.includes(contestType)) {
      throw new ApiError(400, "Некорректный тип конкурса в шаблоне");
    }
    const criteria = TemplateService.normalizeSkeletonCriteria(source.criteria ?? fallbackCriteria);
    const criteriaInequalities = TemplateService.normalizeCriteriaInequalities(
      source.criteriaInequalities,
      criteria.length
    );
    const title = source.title != null ? String(source.title).trim() : "";
    const participantsRaw = Array.isArray(source.participants) ? source.participants : [];
    const juryRaw = Array.isArray(source.jury) ? source.jury : [];
    const participants = participantsRaw.map((participant, participantIndex) => {
      const fullName = participant?.fullName != null ? String(participant.fullName).trim() : "";
      if (!fullName) {
        throw new ApiError(400, `Пустое ФИО участника в позиции ${participantIndex + 1}`);
      }
      return {
        fullName,
        extraInfo:
          participant?.extraInfo != null && String(participant.extraInfo).trim() !== ""
            ? String(participant.extraInfo).trim()
            : null,
        country:
          participant?.country != null && String(participant.country).trim() !== ""
            ? String(participant.country).trim()
            : null,
        photoUrl:
          participant?.photoUrl != null && String(participant.photoUrl).trim() !== ""
            ? String(participant.photoUrl).trim()
            : null
      };
    });
    const usedPhones = new Set();
    const jury = juryRaw.map((juryMember, juryIndex) => {
      const fullName = juryMember?.fullName != null ? String(juryMember.fullName).trim() : "";
      if (!fullName) {
        throw new ApiError(400, `Пустое ФИО жюри в позиции ${juryIndex + 1}`);
      }
      const phoneRaw = juryMember?.phone != null ? String(juryMember.phone) : "";
      const phone = phoneRaw ? phoneRaw.replace(/\s+/g, "") : "";
      if (!/^\+7\d{10}$/.test(phone)) {
        throw new ApiError(400, `Некорректный телефон жюри в позиции ${juryIndex + 1}`);
      }
      if (usedPhones.has(phone)) {
        throw new ApiError(400, "В шаблоне жюри номер телефона повторяется");
      }
      usedPhones.add(phone);
      const password = juryMember?.password != null ? String(juryMember.password) : "";
      if (!password || password.length < 6) {
        throw new ApiError(400, `Пароль жюри не короче 6 символов (позиция ${juryIndex + 1})`);
      }
      return {
        fullName,
        phone,
        position:
          juryMember?.position != null && String(juryMember.position).trim() !== ""
            ? String(juryMember.position).trim()
            : null,
        password,
        photoUrl:
          juryMember?.photoUrl != null && String(juryMember.photoUrl).trim() !== ""
            ? String(juryMember.photoUrl).trim()
            : null
      };
    });
    return {
      title,
      contestType,
      coverImageUrl:
        source.coverImageUrl != null && String(source.coverImageUrl).trim() !== ""
          ? String(source.coverImageUrl).trim()
          : null,
      useCriteriaWeights: Boolean(source.useCriteriaWeights),
      juryPreferencesEnabled: Boolean(source.juryPreferencesEnabled),
      criteria,
      criteriaInequalities,
      participants,
      jury
    };
  }

  /** Создание шаблона мероприятия (каркас) */
  static async createTemplate({
    name,
    criteria,
    organizerId,
    contestType,
    snapshot,
    coverFile,
    filesByField
  }) {
    const title = name != null ? String(name).trim() : "";
    if (!title) {
      throw new ApiError(400, "Укажите название шаблона");
    }
    const type = contestType != null ? String(contestType) : "creative";
    if (!CONTEST_TYPES.includes(type)) {
      throw new ApiError(400, "Некорректный тип конкурса в шаблоне");
    }
    if (coverFile && !String(coverFile.mimetype || "").startsWith("image/")) {
      throw new ApiError(400, "Обложка шаблона должна быть изображением");
    }
    const normalizedSnapshot = TemplateService.normalizeTemplateSnapshot(
      snapshot,
      type,
      criteria
    );
    const coverImageUrl = coverFile ? `/media/contests/${coverFile.filename}` : null;
    if (coverImageUrl) {
      normalizedSnapshot.coverImageUrl = coverImageUrl;
    }
    normalizedSnapshot.participants = normalizedSnapshot.participants.map((participant, index) => {
      const participantPhotoFile = filesByField?.[`participantPhoto_${index}`];
      if (!participantPhotoFile) return participant;
      if (!String(participantPhotoFile.mimetype || "").startsWith("image/")) {
        throw new ApiError(400, `Файл участника ${index + 1} должен быть изображением`);
      }
      return {
        ...participant,
        photoUrl: `/media/participants/${participantPhotoFile.filename}`
      };
    });
    normalizedSnapshot.jury = normalizedSnapshot.jury.map((juryMember, index) => {
      const juryPhotoFile = filesByField?.[`juryPhoto_${index}`];
      if (!juryPhotoFile) return juryMember;
      if (!String(juryPhotoFile.mimetype || "").startsWith("image/")) {
        throw new ApiError(400, `Файл жюри ${index + 1} должен быть изображением`);
      }
      return {
        ...juryMember,
        photoUrl: `/media/jury/${juryPhotoFile.filename}`
      };
    });
    const normalizedCriteria = normalizedSnapshot.criteria;
    const mediaPaths = MediaFileService.collectTemplateSnapshotMediaPaths(normalizedSnapshot);
    const transaction = await sequelize.transaction();
    try {
      const template = await EventTemplate.create(
        {
          name: title,
          criteria: normalizedCriteria,
          contestType: type,
          snapshot: normalizedSnapshot,
          organizerId
        },
        { transaction }
      );
      await MediaFileService.incrementReferences(mediaPaths, transaction);
      await transaction.commit();
      return template;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /** Список шаблонов организатора */
  static async listTemplates(organizerId) {
    return EventTemplate.findAll({
      where: { organizerId },
      order: [["updatedAt", "DESC"]]
    });
  }

  /** Один шаблон (только владелец) */
  static async getTemplateById(id, organizerId) {
    const t = await EventTemplate.findOne({
      where: { id, organizerId }
    });
    if (!t) {
      throw new ApiError(404, "Шаблон не найден");
    }
    return t;
  }

  /** Удаление шаблона (только владелец) */
  static async deleteTemplate(id, organizerId) {
    const t = await EventTemplate.findOne({
      where: { id, organizerId }
    });
    if (!t) {
      throw new ApiError(404, "Шаблон не найден");
    }
    const mediaPaths = MediaFileService.collectTemplateSnapshotMediaPaths(t.snapshot);
    const transaction = await sequelize.transaction();
    let removableMediaPaths = [];
    try {
      await t.destroy({ transaction });
      removableMediaPaths = await MediaFileService.decrementReferences(mediaPaths, transaction);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    MediaFileService.cleanupFiles(removableMediaPaths);
    return { id: Number(id) };
  }
}

module.exports = TemplateService;
