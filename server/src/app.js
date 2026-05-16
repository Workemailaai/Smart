const path = require("path");

require("./config/loadEnv")();

const express = require("express");
const serverConfig = require("./config/serverConfig");
const apiRoutes = require("./routes/api.routes");
const errorMiddleware = require("./middleware/errorMiddleware");
const responseLogger = require("./middleware/responseLogger");

const port = Number(process.env.PORT) || 3000;

const app = express();
serverConfig(app);
app.use(responseLogger);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", apiRoutes);

/** SPA fallback только для клиентских маршрутов без расширения файла */
app.get("/{*splat}", (req, res, next) => {
  const requestPath = req.path;
  const isServicePath =
    requestPath.startsWith("/api") ||
    requestPath.startsWith("/media") ||
    requestPath.startsWith("/uploads") ||
    requestPath.startsWith("/assets");
  const hasFileExtension = /\.[a-z0-9]+$/i.test(requestPath);

  if (isServicePath || hasFileExtension) {
    return next();
  }

  return res.sendFile(path.join(process.cwd(), "public", "dist", "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ message: "Маршрут не найден" });
});

app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Сервер запущен, порт ${port}`);
});
