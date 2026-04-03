const ParticipantService = require("../services/participantService");
const ApiError = require("../utils/ApiError");
const formatResponse = require("../utils/formatResponse");
const { requireFields } = require("../utils/validators");

class ParticipantController {
  /** Создание участника организатором */
  static async createParticipant(req, res, next) {
    try {
      if (req.user.role !== "organizer") {
        throw new ApiError(403, "Only organizer can create participants");
      }
      requireFields(req.body, ["contestId", "fullName", "age"]);
      const participant = await ParticipantService.createParticipant({
        ...req.body,
        organizerId: req.user.id
      });
      return res
        .status(201)
        .json(formatResponse(201, "Participant created", participant));
    } catch (error) {
      return next(error);
    }
  }

  /** Список участников по конкурсу */
  static async getParticipants(req, res, next) {
    try {
      const participants = await ParticipantService.listParticipants(
        req.params.contestId
      );
      return res
        .status(200)
        .json(formatResponse(200, "Participants list", participants));
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = ParticipantController;
