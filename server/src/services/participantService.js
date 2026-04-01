const { Contest, Participant } = require("../db/models");
const ApiError = require("../utils/ApiError");

async function createParticipant({ contestId, organizerId, fullName, age }) {
  const contest = await Contest.findByPk(contestId);
  if (!contest) throw new ApiError(404, "Contest not found");
  if (contest.organizerId !== organizerId) {
    throw new ApiError(403, "Only contest organizer can add participants");
  }

  return Participant.create({ contestId, fullName, age });
}

async function listParticipants(contestId) {
  return Participant.findAll({ where: { contestId } });
}

module.exports = {
  createParticipant,
  listParticipants
};
