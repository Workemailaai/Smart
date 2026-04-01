const jwtConfig = {
  access: {
    expiresIn: "15m"
  },
  refresh: {
    expiresIn: "7d"
  }
};

module.exports = jwtConfig;
