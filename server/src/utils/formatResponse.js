function formatResponse(statusCode, message, data = null, error = null) {
  return {
    statusCode,
    message,
    data,
    error
  };
}

module.exports = formatResponse;
