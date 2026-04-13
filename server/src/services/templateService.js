const { EventTemplate } = require("../db/models");
const ApiError = require("../utils/ApiError");
const { CONTEST_TYPES } = require("../constants/contestTypes");

class TemplateService {
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
        return { name, maxScore: 10 };
      }
      if (c && typeof c === "object") {
        const name = c.name != null ? String(c.name).trim() : "";
        const maxScore = Number(c.maxScore);
        if (!name) {
          throw new ApiError(400, `Пустое название критерия в позиции ${idx + 1}`);
        }
        if (!Number.isInteger(maxScore) || maxScore < 1) {
          throw new ApiError(
            400,
            `Некорректная верхняя граница у критерия «${name}» (целое число ≥ 1)`
          );
        }
        return { name, maxScore };
      }
      throw new ApiError(400, "Некорректный элемент в criteria");
    });
  }

  /** Создание шаблона мероприятия (каркас) */
  static async createTemplate({ name, criteria, organizerId, contestType }) {
    const title = name != null ? String(name).trim() : "";
    if (!title) {
      throw new ApiError(400, "Укажите название шаблона");
    }
    const type = contestType != null ? String(contestType) : "miss_world";
    if (!CONTEST_TYPES.includes(type)) {
      throw new ApiError(400, "Некорректный тип конкурса в шаблоне");
    }
    const normalizedCriteria = TemplateService.normalizeSkeletonCriteria(criteria);
    return EventTemplate.create({
      name: title,
      criteria: normalizedCriteria,
      contestType: type,
      organizerId
    });
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
    await t.destroy();
    return { id: Number(id) };
  }
}

module.exports = TemplateService;
