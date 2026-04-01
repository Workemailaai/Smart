const bcrypt = require("bcrypt");
const { Contest, Jury, User } = require("../db/models");
const ApiError = require("../utils/ApiError");

async function createJuryMember({ contestId, organizerId, fullName, email, password }) {
  const contest = await Contest.findByPk(contestId);
  if (!contest) throw new ApiError(404, "Contest not found");
  if (contest.organizerId !== organizerId) {
    throw new ApiError(403, "Only contest organizer can add jury");
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) throw new ApiError(409, "User with this email already exists");

  const hashedPassword = await bcrypt.hash(password, 10);
  const juryUser = await User.create({
    fullName,
    email,
    password: hashedPassword,
    role: "jury"
  });

  const jury = await Jury.create({ contestId, userId: juryUser.id });
  return { jury, user: juryUser };
}

async function listJuryMembers(contestId) {
  return Jury.findAll({
    where: { contestId },
    include: [{ model: User, as: "user", attributes: ["id", "fullName", "email", "role"] }]
  });
}

module.exports = {
  createJuryMember,
  listJuryMembers
};
