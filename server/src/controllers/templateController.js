const TemplateService = require("../services/templateService");
const ApiError = require("../utils/ApiError");
const formatResponse = require("../utils/formatResponse");
const { requireFields } = require("../utils/validators");

class TemplateController {
  static ensureOrganizer(req) {
    if (req.user.role !== "organizer") {
      throw new ApiError(403, "Шаблоны может менять только организатор");
    }
  }

  /** Создать шаблон */
  static async createTemplate(req, res, next) {
    try {
      TemplateController.ensureOrganizer(req);
      let body = req.body || {};
      if (typeof req.body?.payload === "string") {
        try {
          body = JSON.parse(req.body.payload);
        } catch {
          throw new ApiError(400, "Поле payload должно быть корректным JSON");
        }
      }
      requireFields(body, ["name", "criteria"]);
      const filesByField = {};
      for (const file of req.files || []) {
        if (filesByField[file.fieldname]) {
          throw new ApiError(400, `Дублируется файл в поле ${file.fieldname}`);
        }
        filesByField[file.fieldname] = file;
      }
      const template = await TemplateService.createTemplate({
        name: body.name,
        criteria: body.criteria,
        organizerId: req.user.id,
        contestType: body.contestType,
        snapshot: body.snapshot,
        coverFile: filesByField.cover
      });
      return res
        .status(201)
        .json(
          formatResponse(201, "Шаблон мероприятия создан", template)
        );
    } catch (error) {
      return next(error);
    }
  }

  /** Список шаблонов текущего организатора */
  static async getTemplates(req, res, next) {
    try {
      TemplateController.ensureOrganizer(req);
      const templates = await TemplateService.listTemplates(req.user.id);
      return res
        .status(200)
        .json(formatResponse(200, "Список шаблонов", templates));
    } catch (error) {
      return next(error);
    }
  }

  /** Один шаблон по id */
  static async getTemplateById(req, res, next) {
    try {
      TemplateController.ensureOrganizer(req);
      const template = await TemplateService.getTemplateById(
        req.params.id,
        req.user.id
      );
      return res
        .status(200)
        .json(formatResponse(200, "Шаблон", template));
    } catch (error) {
      return next(error);
    }
  }

  /** Удалить шаблон */
  static async deleteTemplate(req, res, next) {
    try {
      TemplateController.ensureOrganizer(req);
      const result = await TemplateService.deleteTemplate(
        req.params.id,
        req.user.id
      );
      return res
        .status(200)
        .json(formatResponse(200, "Шаблон удалён", result));
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = TemplateController;
