const path = require("path");

/** Загружает .env.{режим} и .env.local (один раз при старте) */
function loadEnv() {
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || "development";

  require("dotenv").config({
    path: path.resolve(process.cwd(), `.env.${appEnv}`),
  });
  require("dotenv").config({
    path: path.resolve(process.cwd(), ".env.local"),
    override: true,
  });
  // запасной вариант для старого .env (не перезаписывает уже заданные ключи)
  require("dotenv").config({
    path: path.resolve(process.cwd(), ".env"),
  });
}

module.exports = loadEnv;
