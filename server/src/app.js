require("dotenv").config();
const express = require("express");
const path = require("path");
const process = require("process");
const serverConfig = require("./config/serverConfig");
const apiRoutes = require("./routes/api.routes");
const errorMiddleware = require("./middleware/errorMiddleware");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const { PORT } = process.env || 3000;

const app = express();
serverConfig(app);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", apiRoutes);
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
