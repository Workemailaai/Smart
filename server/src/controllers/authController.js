const cookieConfig = require("../config/cookieConfig");
const authService = require("../services/authService");
const formatResponse = require("../utils/formatResponse");
const { requireFields } = require("../utils/validators");

async function registerOrganizer(req, res, next) {
  try {
    requireFields(req.body, ["fullName", "email", "password"]);
    const user = await authService.registerOrganizer(req.body);
    return res
      .status(201)
      .json(formatResponse(201, "Organizer registered successfully", user));
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    requireFields(req.body, ["email", "password"]);
    const data = await authService.login(req.body);
    res.cookie("refreshToken", data.refreshToken, cookieConfig.refreshToken);
    return res.status(200).json(
      formatResponse(200, "Login successful", {
        accessToken: data.accessToken,
        user: data.user
      })
    );
  } catch (error) {
    return next(error);
  }
}

function logout(_req, res) {
  res.clearCookie("refreshToken", cookieConfig.refreshToken);
  return res.status(200).json(formatResponse(200, "Logout successful"));
}

module.exports = {
  registerOrganizer,
  login,
  logout
};
