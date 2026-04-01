const path = require("path");
const express = require("express");
const process = require("process");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const removeHeader = require("../middleware/removeHeader");

const corsOptions = {
  origin: [process.env.CLIENT_URL],
  credentials: true,
};

function serverConfig(app) {
  app.use(removeHeader);
  app.use(cors(corsOptions));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(morgan("dev"));
  app.use(cookieParser());
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
}

module.exports = serverConfig;
