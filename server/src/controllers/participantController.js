const participantService = require("../services/participantService");
const ApiError = require("../utils/ApiError");
const formatResponse = require("../utils/formatResponse");
const { requireFields } = require("../utils/validators");

async function createParticipant(req, res, next) {
  try {
    if (req.user.role !== "organizer") {
      throw new ApiError(403, "Only organizer can create participants");
    }
    requireFields(req.body, ["contestId", "fullName", "age"]);
    const participant = await participantService.createParticipant({
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

async function getParticipants(req, res, next) {
  try {
    const participants = await participantService.listParticipants(req.params.contestId);
    return res
      .status(200)
      .json(formatResponse(200, "Participants list", participants));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createParticipant,
  getParticipants
};
