const jwt = require("jsonwebtoken");
const jwtConfig = require("../config/jwtConfig");

/** Формирует payload { user } для access/refresh JWT */
function buildUserPayload(user) {
  const plain = user.get ? user.get({ plain: true }) : { ...user };
  const payloadUser = {
    id: plain.id,
    phone: plain.phone,
    fullName: plain.fullName,
    role: plain.role
  };
  return { user: payloadUser };
}

/** Выдача пары токенов (как в примере — внутри jwt лежит объект { user }) */
function generateJWTTokens({ user }) {
  const payload = buildUserPayload(user);
  return {
    accessToken: jwt.sign(
      payload,
      process.env.SECRET_ACCESS_TOKEN,
      jwtConfig.access
    ),
    refreshToken: jwt.sign(
      payload,
      process.env.SECRET_REFRESH_TOKEN,
      jwtConfig.refresh
    )
  };
}

module.exports = {
  generateJWTTokens
};
