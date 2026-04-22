const ContestService = require("../services/contestService");
const ContestExportService = require("../services/contestExportService");
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
        .json(formatResponse(200, "Список мероприятий", contests));
    } catch (error) {
      return next(error);
    }
  }

  /** Детальная страница мероприятия для жюри */
  static async getJuryContestView(req, res, next) {
    try {
      if (req.user.role !== "jury") {
        throw new ApiError(403, "Только жюри может открывать этот раздел");
      }
      const data = await ContestService.getJuryContestView({
        contestId: Number(req.params.id),
        userId: req.user.id
      });
      return res
        .status(200)
        .json(formatResponse(200, "Данные мероприятия для жюри", data));
    } catch (error) {
      return next(error);
    }
  }

  /** Детальная страница мероприятия для организатора */
  static async getOrganizerContestView(req, res, next) {
    try {
      if (req.user.role !== "organizer") {
        throw new ApiError(403, "Только организатор может открывать этот раздел");
      }
      const data = await ContestService.getOrganizerContestView({
        contestId: Number(req.params.id),
        userId: req.user.id
      });
      return res
        .status(200)
        .json(formatResponse(200, "Данные мероприятия для организатора", data));
    } catch (error) {
      return next(error);
    }
  }

  /** Порядок показателей (жюри): только при juryPreferencesEnabled и useCriteriaWeights */
  static async reorderJuryCriteria(req, res, next) {
    try {
      if (req.user.role !== "jury") {
        throw new ApiError(403, "Только жюри может менять порядок показателей");
      }
      const orderedCriterionIds = req.body?.orderedCriterionIds;
      const data = await ContestService.reorderCriteriaByJury({
        contestId: Number(req.params.id),
        userId: req.user.id,
        orderedCriterionIds
      });
      return res.status(200).json(formatResponse(200, "Порядок показателей обновлён", data));
    } catch (error) {
      return next(error);
    }
  }

  /** Финальная отправка оценок жюри */
  static async submitJuryScores(req, res, next) {
    try {
      if (req.user.role !== "jury") {
        throw new ApiError(403, "Только жюри может отправить оценки");
      }
      const data = await ContestService.submitJuryScores({
        contestId: Number(req.params.id),
        userId: req.user.id
      });
      return res.status(200).json(formatResponse(200, "Оценки отправлены", data));
    } catch (error) {
      return next(error);
    }
  }

  /** Перевод жюри в режим переголосования */
  static async revokeJurySubmission(req, res, next) {
    try {
      if (req.user.role !== "jury") {
        throw new ApiError(403, "Только жюри может переголосовать");
      }
      const data = await ContestService.revokeJurySubmission({
        contestId: Number(req.params.id),
        userId: req.user.id
      });
      return res.status(200).json(formatResponse(200, "Отправка оценок отменена", data));
    } catch (error) {
      return next(error);
    }
  }

  /** Удаление мероприятия организатором (только на этапе оценивания) */
  static async deleteContest(req, res, next) {
    try {
      if (req.user.role !== "organizer") {
        throw new ApiError(403, "Только организатор может удалить мероприятие");
      }
      await ContestService.deleteContestByOrganizer({
        contestId: Number(req.params.id),
        userId: req.user.id
      });
      return res.status(200).json(formatResponse(200, "Мероприятие удалено", null));
    } catch (error) {
      return next(error);
    }
  }

  /** Завершение мероприятия организатором */
  static async completeContest(req, res, next) {
    try {
      if (req.user.role !== "organizer") {
        throw new ApiError(403, "Только организатор может завершить мероприятие");
      }
      const contest = await ContestService.completeContestByOrganizer({
        contestId: Number(req.params.id),
        userId: req.user.id
      });
      return res.status(200).json(formatResponse(200, "Мероприятие завершено", contest));
    } catch (error) {
      return next(error);
    }
  }

  static async getContestResultsView(req, res, next) {
    try {
      const data = await ContestService.getContestResultsView({
        contestId: Number(req.params.id),
        user: req.user
      });
      return res
        .status(200)
        .json(formatResponse(200, "Результаты мероприятия", data));
    } catch (error) {
      return next(error);
    }
  }

  static async exportContestReport(req, res, next) {
    try {
      if (req.user.role !== "organizer") {
        throw new ApiError(403, "Только организатор может экспортировать отчет");
      }
      const contestId = Number(req.params.id);
      const fileBuffer = await ContestExportService.generateContestWorkbookBuffer({
        contestId,
        userId: req.user.id
      });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="contest-${contestId}-report.xlsx"`
      );
      return res.status(200).send(Buffer.from(fileBuffer));
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = ContestController;
