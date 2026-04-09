const bcrypt = require("bcrypt");
const { Contest, Jury, User } = require("../db/models");
const ApiError = require("../utils/ApiError");

class JuryService {
  /** Создание пользователя-жюри и назначение на конкурс */
  static async createJuryMember({ contestId, organizerId, fullName, phone, password }) {
    const contest = await Contest.findByPk(contestId);
    if (!contest) throw new ApiError(404, "Contest not found");
    if (contest.organizerId !== organizerId) {
      throw new ApiError(403, "Only contest organizer can add jury");
    }

    const normalizedPhone = User.normalizePhone(phone);
    if (!/^\+7\d{10}$/.test(normalizedPhone)) {
      throw new ApiError(422, "Некорректный номер телефона");
    }

    const existing = await User.findOne({ where: { phone: normalizedPhone } });
    if (existing) throw new ApiError(409, "Пользователь с этим номером уже существует");

    const hashedPassword = await bcrypt.hash(password, 10);
    const juryUser = await User.create({
      fullName,
      phone: normalizedPhone,
      password: hashedPassword,
      role: "jury"
    });

    const jury = await Jury.create({ contestId, userId: juryUser.id });
    return { jury, user: juryUser };
  }

  /** Члены жюри конкурса */
  static async listJuryMembers(contestId) {
    return Jury.findAll({
      where: { contestId },
      include: [{ model: User, as: "user", attributes: ["id", "fullName", "phone", "role"] }]
    });
  }
}

module.exports = JuryService;
