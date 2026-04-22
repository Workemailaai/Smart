const jwtConfig = {
  access: {
    expiresIn: "120m"
  },
  refresh: {
    expiresIn: "7d"
  }
};

module.exports = jwtConfig;
