const ContestService = require("../services/contestService");
const ApiError = require("../utils/ApiError");
const formatResponse = require("../utils/formatResponse");
const { requireFields } = require("../utils/validators");
const { CONTEST_TYPES, CONTEST_TYPE_LABELS } = require("../constants/contestTypes");

class ContestController {
  /** Создание конкурса организатором (без вложенностей) */
  static async createContest(req, res, next) {
    try {
      if (req.user.role !== "organizer") {
        throw new ApiError(403, "Only organizer can create contests");
      }
      requireFields(req.body, ["title"]);
      const contest = await ContestService.createContest({
        title: req.body.title,
        description: req.body.description,
        organizerId: req.user.id,
        contestType: req.body.contestType,
        coverImageUrl: req.body.coverImageUrl
      });
      return res
        .status(201)
        .json(formatResponse(201, "Мероприятие создано", contest));
    } catch (error) {
      return next(error);
    }
  }

  /** Создание мероприятия из конструктора (multipart: payload + файлы) */
  static async createContestFull(req, res, next) {
    try {
      if (req.user.role !== "organizer") {
        throw new ApiError(403, "Конструктор доступен только организатору");
      }
      const raw = req.body?.payload;
      if (!raw || typeof raw !== "string") {
        throw new ApiError(400, "Передайте поле payload (JSON-строка с данными мероприятия)");
      }
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new ApiError(400, "Поле payload должно быть корректным JSON");
      }
      const filesByField = {};
      for (const f of req.files || []) {
        if (filesByField[f.fieldname]) {
          throw new ApiError(400, `Дублируется файл в поле ${f.fieldname}`);
        }
        filesByField[f.fieldname] = f;
      }
      const contest = await ContestService.createContestFull({
        organizerId: req.user.id,
        payload,
        filesByField
      });
      return res
        .status(201)
        .json(formatResponse(201, "Мероприятие создано со всеми данными", contest));
    } catch (error) {
      return next(error);
    }
  }

  /** Справочник типов конкурса для конструктора */
  static async getContestTypes(_req, res, next) {
    try {
      const types = CONTEST_TYPES.map((id) => ({
        id,
        label: CONTEST_TYPE_LABELS[id] || id
      }));
      return res.status(200).json(formatResponse(200, "Типы конкурсов", types));
    } catch (error) {
      return next(error);
    }
  }

  /** Получение списка конкурсов по роли */
  static async getContests(req, res, next) {
    try {
      const contests = await ContestService.listContests(req.user);
      return res
        .status(200)
        .json(formatResponse(200, "Contests list", contests));
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = ContestController;
