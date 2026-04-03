const formatResponse = require("../utils/formatResponse");

function errorMiddleware(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const details = err.details || null;
  const route = req?.originalUrl || req?.url || "";

  if (statusCode >= 500) {
    console.error(
      `[Ошибка API] ${req?.method || "?"} ${route} → ${statusCode} (исключение до ответа).`,
      message,
      err.stack || err
    );
  }

  res.status(statusCode).json(formatResponse(statusCode, message, null, details));
}

module.exports = errorMiddleware;
