const { Contest, Participant } = require("../db/models");
const ApiError = require("../utils/ApiError");

class ParticipantService {
  /** Добавление участника в конкурс */
  static async createParticipant({
    contestId,
    organizerId,
    fullName,
    extraInfo,
    country,
    photoUrl
  }) {
    const contest = await Contest.findByPk(contestId);
    if (!contest) throw new ApiError(404, "Contest not found");
    if (contest.organizerId !== organizerId) {
      throw new ApiError(403, "Only contest organizer can add participants");
    }

    const countryTrim =
      country != null && String(country).trim() !== "" ? String(country).trim() : null;
    const extraInfoTrim =
      extraInfo != null && String(extraInfo).trim() !== "" ? String(extraInfo).trim() : null;
    return Participant.create({
      contestId,
      fullName,
      extraInfo: extraInfoTrim,
      photoUrl: photoUrl || null,
      country: countryTrim
    });
  }

  /** Участники конкурса */
  static async listParticipants(contestId) {
    return Participant.findAll({ where: { contestId } });
  }
}

module.exports = ParticipantService;
