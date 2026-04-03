/**
 * Логирует исходящие JSON-ответы по коду: успех (2xx), клиент (4xx), сервер (5xx).
 * Подключается до маршрутов — охватывает все end-point'ы, где вызывается res.json.
 */
function responseLogger(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function logThenJson(body) {
    const status = res.statusCode;
    const route = req.originalUrl || req.url;
    const method = req.method;
    const msg =
      body && typeof body === "object" && body.message != null
        ? String(body.message)
        : "";
    let detailStr = "";
    if (body && typeof body === "object") {
      const d = body.error ?? body.details;
      if (d != null) {
        detailStr =
          typeof d === "string" ? d : JSON.stringify(d);
      }
    }

    if (status >= 500) {
      console.error(
        `[Ответ API] ${method} ${route} → ${status} (ошибка сервера).`,
        msg ? `Сообщение: ${msg}.` : "",
        detailStr ? `Детали: ${detailStr}` : ""
      );
    } else if (status >= 400) {
      console.warn(
        `[Ответ API] ${method} ${route} → ${status} (ошибка запроса).`,
        msg ? `Сообщение: ${msg}.` : "",
        detailStr ? `Детали: ${detailStr}` : ""
      );
    } else {
      console.log(
        `[Ответ API] ${method} ${route} → ${status} (успех).`,
        msg ? `Сообщение: ${msg}.` : ""
      );
    }

    return originalJson(body);
  };

  next();
}

module.exports = responseLogger;
