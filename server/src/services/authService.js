const bcrypt = require("bcrypt");
const { User } = require("../db/models");
const ApiError = require("../utils/ApiError");
const {
  generateAccessToken,
  generateRefreshToken
} = require("../utils/generateJWTToken");

async function registerOrganizer({ fullName, email, password }) {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new ApiError(409, "User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    fullName,
    email,
    password: hashedPassword,
    role: "organizer"
  });

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ where: { email } });
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  const matched = await bcrypt.compare(password, user.password);
  if (!matched) {
    throw new ApiError(401, "Invalid credentials");
  }

  const payload = { id: user.id, role: user.role, email: user.email };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }
  };
}

module.exports = {
  registerOrganizer,
  login
};
