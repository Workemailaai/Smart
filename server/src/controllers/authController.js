const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../db/models");
const formatResponse = require("../utils/formatResponse");
const { generateJWTTokens } = require("../utils/generateJWTToken");
const cookieConfig = require("../config/cookieConfig");
const process = require("process");

/** Роли с доступом в личный кабинет (вход на сайт) */
const CABINET_ROLES = ["organizer", "jury"];

class AuthController {
  /** Обновление сессии по refresh в cookie */
  static async refreshTokens(req, res) {
    try {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        return res
          .status(401)
          .json(
            formatResponse(401, "Нет refresh-токена", null, "Нет refresh-токена")
          );
      }

      const { user: tokenUser } = jwt.verify(
        refreshToken,
        process.env.SECRET_REFRESH_TOKEN
      );

      const user = await User.findByPk(tokenUser.id);
      if (!user || !user.isActive) {
        return res
          .status(404)
          .json(
            formatResponse(
              404,
              "Пользователь не найден",
              null,
              "Пользователь не найден"
            )
          );
      }

      if (!CABINET_ROLES.includes(user.role)) {
        return res
          .status(403)
          .json(
            formatResponse(
              403,
              "Вход для этой роли недоступен",
              null,
              "Вход для этой роли недоступен"
            )
          );
      }

      const { accessToken, refreshToken: newRefreshToken } = generateJWTTokens({
        user
      });

      const plain = user.get({ plain: true });
      delete plain.password;

      return res
        .status(201)
        .cookie("refreshToken", newRefreshToken, cookieConfig.refreshToken)
        .json(
          formatResponse(201, "Сессия успешно продлена", {
            user: plain,
            accessToken
          })
        );
    } catch ({ message }) {
      console.log(
        "[Авторизация] Обновление токенов — ошибка:",
        message
      );
      res
        .status(401)
        .json(
          formatResponse(401, "Недействительный refresh-токен", null, message)
        );
    }
  }

  /** Регистрация только организатора (логин = email) */
  static async signUp(req, res) {
    const { fullName, email, password } = req.body;

    const { isValid, error } = User.validateSignUpData({
      fullName,
      email,
      password
    });

    if (!isValid) {
      return res.status(422).json(formatResponse(422, error, null, error));
    }

    const normalizedEmail = email.trim().toLowerCase();
    try {
      const userFound = await User.findOne({
        where: { email: normalizedEmail }
      });

      if (userFound) {
        return res
          .status(409)
          .json(
            formatResponse(
              409,
              `Пользователь с email (${email}) уже существует`,
              null,
              `Пользователь с email (${email}) уже существует`
            )
          );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "organizer"
      });

      if (!newUser) {
        return res
          .status(500)
          .json(
            formatResponse(
              500,
              "Не удалось создать пользователя",
              null,
              "Не удалось создать пользователя"
            )
          );
      }

      const plain = newUser.get({ plain: true });
      delete plain.password;

      return res
        .status(201)
        .json(
          formatResponse(
            201,
            "Организатор успешно зарегистрирован",
            { accessToken: "", user: plain },
            null
          )
        );
    } catch ({ message }) {
      console.error("[Авторизация] Регистрация — ошибка:", message);
      res
        .status(500)
        .json(
          formatResponse(500, "Внутренняя ошибка сервера", null, message)
        );
    }
  }

  /** Вход организатора и членов жюри */
  static async signIn(req, res) {
    const { email, password } = req.body;

    const { isValid, error } = User.validateSignInData({
      email,
      password
    });

    if (!isValid) {
      return res.status(422).json(formatResponse(422, error, null, error));
    }

    const normalizedEmail = email.trim().toLowerCase();
    try {
      const userFound = await User.findOne({
        where: { email: normalizedEmail }
      });

      if (!userFound) {
        return res
          .status(404)
          .json(
            formatResponse(
              404,
              `Пользователь с email (${email}) не найден`,
              null,
              `Пользователь с email (${email}) не найден`
            )
          );
      }

      if (!userFound.isActive) {
        return res
          .status(403)
          .json(
            formatResponse(
              403,
              "Учётная запись отключена",
              null,
              "Учётная запись отключена"
            )
          );
      }

      if (!CABINET_ROLES.includes(userFound.role)) {
        return res
          .status(403)
          .json(
            formatResponse(
              403,
              "Вход в личный кабинет для этой роли недоступен",
              null,
              "Вход в личный кабинет для этой роли недоступен"
            )
          );
      }

      const isPasswordValid = await bcrypt.compare(password, userFound.password);

      if (!isPasswordValid) {
        return res
          .status(401)
          .json(
            formatResponse(401, "Неверный пароль", null, "Неверный пароль")
          );
      }

      const plain = userFound.get({ plain: true });
      delete plain.password;

      const { accessToken, refreshToken } = generateJWTTokens({
        user: userFound
      });

      return res
        .status(200)
        .cookie("refreshToken", refreshToken, cookieConfig.refreshToken)
        .json(
          formatResponse(
            200,
            "Пользователь успешно вошёл",
            { accessToken, user: plain },
            null
          )
        );
    } catch ({ message }) {
      console.error("[Авторизация] Вход — ошибка:", message);
      res
        .status(500)
        .json(
          formatResponse(500, "Внутренняя ошибка сервера", null, message)
        );
    }
  }

  static signOut(req, res) {
    try {
      res
        .clearCookie("refreshToken", {
          ...cookieConfig.refreshToken,
          maxAge: 0
        })
        .json(formatResponse(200, "Успешно вышли"));
    } catch ({ message }) {
      console.log("[Авторизация] Выход — ошибка:", message);
      res
        .status(500)
        .json(
          formatResponse(500, "Внутренняя ошибка сервера", null, message)
        );
    }
  }
}

module.exports = AuthController;
