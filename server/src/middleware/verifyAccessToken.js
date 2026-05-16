const jwt = require("jsonwebtoken");
const formatResponse = require("../utils/formatResponse");

/** Проверка Bearer access-токена, пользователь в req.user для контроллеров */
function verifyAccessToken(req, res, next) {
  try {
    const header = req.headers.authorization;    
    if (!header?.startsWith("Bearer ")) {
      console.log(
        "[Проверка токена] Нет заголовка авторизации или он не в формате Bearer"
      );
      return res
        .status(403)
        .json(
          formatResponse(
            403,
            "Доступ запрещён",
            null,
            "Отсутствует или неверный заголовок Authorization"
          )
        );
    }
    const accessToken = header.split(" ")[1];
    const { user } = jwt.verify(accessToken, process.env.SECRET_ACCESS_TOKEN);
    req.user = user;
    res.locals.user = user;
    next();
  } catch ({ message }) {
    console.log("[Проверка токена] Недействительный или просроченный токен:", message);
    res
      .status(403)
      .json(
        formatResponse(
          403,
          "Недействительный access-токен",
          null,
          message
        )
      );
  }
}

module.exports = verifyAccessToken;
