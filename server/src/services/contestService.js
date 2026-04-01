const { Contest } = require("../db/models");
const ApiError = require("../utils/ApiError");

async function createContest({ title, description, organizerId }) {
  const contest = await Contest.create({ title, description, organizerId });
  return contest;
}

async function listContests(user) {
  if (user.role === "organizer") {
    return Contest.findAll({ where: { organizerId: user.id } });
  }
  return Contest.findAll();
}

async function getContestById(id) {
  const contest = await Contest.findByPk(id);
  if (!contest) throw new ApiError(404, "Contest not found");
  return contest;
}

module.exports = {
  createContest,
  listContests,
  getContestById
};
