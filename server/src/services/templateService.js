const { EventTemplate } = require("../db/models");
const ApiError = require("../utils/ApiError");

class TemplateService {
  /** Проверка: criteria — непустой массив строк */
  static assertCriteriaShape(criteria) {
    if (!Array.isArray(criteria) || criteria.length === 0) {
      throw new ApiError(
        400,
        "Передайте criteria как непустой массив строк (названия критериев)"
      );
    }
    const bad = criteria.some(
      (c) => typeof c !== "string" || String(c).trim() === ""
    );
    if (bad) {
      throw new ApiError(
        400,
        "Каждый элемент criteria должен быть непустой строкой"
      );
    }
  }

  /** Создание шаблона мероприятия */
  static async createTemplate({ name, criteria, organizerId }) {
    const title = name != null ? String(name).trim() : "";
    if (!title) {
      throw new ApiError(400, "Укажите название шаблона");
    }
    TemplateService.assertCriteriaShape(criteria);
    const normalized = criteria.map((c) => String(c).trim());
    return EventTemplate.create({
      name: title,
      criteria: normalized,
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
