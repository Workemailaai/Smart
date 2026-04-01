const ApiError = require("./ApiError");

function requireFields(payload, fields) {
  for (const field of fields) {
    if (!payload[field]) {
      throw new ApiError(400, `Field "${field}" is required`);
    }
  }
}

module.exports = {
  requireFields
};
