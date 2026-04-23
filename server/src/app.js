require("dotenv").config();
const express = require("express");
const path = require("path");
const process = require("process");
const serverConfig = require("./config/serverConfig");
const apiRoutes = require("./routes/api.routes");
const errorMiddleware = require("./middleware/errorMiddleware");
const responseLogger = require("./middleware/responseLogger");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const { PORT } = process.env || 3000;

const app = express();
serverConfig(app);
app.use(responseLogger);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", apiRoutes);
app.use(errorMiddleware);

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен, порт ${PORT}`);
});
