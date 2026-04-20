const bcrypt = require("bcrypt");
const { Contest, Jury, User } = require("../db/models");
const ApiError = require("../utils/ApiError");

class JuryService {
  /**
   * Создаёт или находит пользователя-жюри, проверяет пароль при существующем,
   * назначает на конкурс с полями профиля в рамках конкурса.
   * @param {object} options
   * @param {import('sequelize').Transaction | undefined} transaction
   */
  static async assignJuryToContest(
    {
      contestId,
      organizerId,
      fullName,
      phone,
      password,
      position,
      photoUrl
    },
    transaction
  ) {
    const contest = await Contest.findByPk(contestId, { transaction });
    if (!contest) throw new ApiError(404, "Конкурс не найден");
    if (contest.organizerId !== organizerId) {
      throw new ApiError(403, "Только организатор конкурса может добавлять жюри");
    }

    const normalizedPhone = User.normalizePhone(phone);
    if (!/^\+7\d{10}$/.test(normalizedPhone)) {
      throw new ApiError(422, "Некорректный номер телефона");
    }

    if (!password || String(password).length < 6) {
      throw new ApiError(422, "Пароль жюри не короче 6 символов");
    }

    const nameTrim = fullName != null ? String(fullName).trim() : "";
    if (!nameTrim) {
      throw new ApiError(422, "Укажите ФИО жюри");
    }

    let user = await User.findOne({ where: { phone: normalizedPhone }, transaction });

    if (!user) {
      const hashedPassword = await bcrypt.hash(String(password), 10);
      user = await User.create(
        {
          fullName: nameTrim,
          phone: normalizedPhone,
          password: hashedPassword,
          role: "jury"
        },
        { transaction }
      );
    } else if (user.role === "jury") {
      const isPasswordValid = await bcrypt.compare(String(password), user.password);
      if (!isPasswordValid) {
        throw new ApiError(401, "Неверный пароль для существующей учётной записи жюри");
      }
    } else {
      throw new ApiError(
        409,
        "Пользователь с этим номером уже зарегистрирован как организатор"
      );
    }

    const existingAssignment = await Jury.findOne({
      where: { contestId, userId: user.id },
      transaction
    });
    if (existingAssignment) {
      throw new ApiError(409, "Жюри с этим номером уже добавлено в данный конкурс");
    }

    const positionTrim =
      position != null && String(position).trim() !== "" ? String(position).trim() : null;

    return Jury.create(
      {
        contestId,
        userId: user.id,
        displayName: nameTrim,
        photoUrl: photoUrl || null,
        position: positionTrim
      },
      { transaction }
    );
  }

  /** Создание/привязка жюри (одиночный вызов API) */
  static async createJuryMember({ contestId, organizerId, fullName, phone, password, position, photoUrl }) {
    const jury = await JuryService.assignJuryToContest(
      {
        contestId,
        organizerId,
        fullName,
        phone,
        password,
        position,
        photoUrl
      },
      undefined
    );
    const user = await User.findByPk(jury.userId);
    return { jury, user };
  }

  /** Члены жюри конкурса */
  static async listJuryMembers(contestId) {
    return Jury.findAll({
      where: { contestId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullName", "phone", "role"]
        }
      ]
    });
  }
}

module.exports = JuryService;
