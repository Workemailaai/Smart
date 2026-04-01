const path = require("path");
const jwt = require("jsonwebtoken");
const process = require("process");
const jwtConfig = require("../config/jwtConfig");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const generateJWTToken = (payload) => ({
  accessToken: jwt.sign(
    payload,
    process.env.SECRET_ACCESS_TOKEN,
    jwtConfig.access,
  ),
  refreshToken: jwt.sign(
    payload,
    process.env.SECRET_REFRESH_TOKEN,
    jwtConfig.refresh,
  ),
});

module.exports = {
  generateJWTToken,
};
