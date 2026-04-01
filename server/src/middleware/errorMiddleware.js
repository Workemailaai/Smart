const formatResponse = require("../utils/formatResponse");

function errorMiddleware(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const details = err.details || null;

  res.status(statusCode).json(formatResponse(statusCode, message, null, details));
}

module.exports = errorMiddleware;
