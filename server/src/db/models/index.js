"use strict";

const fs = require("fs");
const path = require("path");
const process = require("process");
const MODELS_DIR = path.resolve(process.cwd(), "src", "db", "models");
require("../../config/loadEnv")();
const Sequelize = require("sequelize");

const basename = "index.js";
const env = process.env.NODE_ENV || "development";
const config = require(path.resolve(process.cwd(), "src", "db", "config", "database.json"))[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs.readdirSync(MODELS_DIR)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  })
  .forEach((file) => {
    const model = require(path.join(MODELS_DIR, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;
db.Op = Sequelize.Op;

module.exports = db;
