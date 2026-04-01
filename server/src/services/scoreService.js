const { Contest, Criterion, Jury, Participant, Score } = require("../db/models");
const ApiError = require("../utils/ApiError");

async function putScore({ userId, contestId, participantId, criterionId, value }) {
  const contest = await Contest.findByPk(contestId);
  if (!contest) throw new ApiError(404, "Contest not found");

  const jury = await Jury.findOne({ where: { contestId, userId } });
  if (!jury) throw new ApiError(403, "You are not assigned as jury for this contest");

  const participant = await Participant.findByPk(participantId);
  if (!participant || participant.contestId !== Number(contestId)) {
    throw new ApiError(400, "Participant is not in this contest");
  }

  const criterion = await Criterion.findByPk(criterionId);
  if (!criterion || criterion.contestId !== Number(contestId)) {
    throw new ApiError(400, "Criterion is not in this contest");
  }

  if (value < 0 || value > criterion.maxScore) {
    throw new ApiError(400, `Score must be between 0 and ${criterion.maxScore}`);
  }

  const [score] = await Score.upsert(
    {
      contestId,
      juryId: jury.id,
      participantId,
      criterionId,
      value
    },
    { returning: true }
  );
  return score;
}

async function getContestScores(contestId) {
  return Score.findAll({ where: { contestId } });
}

module.exports = {
  putScore,
  getContestScores
};
