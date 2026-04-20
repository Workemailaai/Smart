"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MediaFile extends Model {}

  MediaFile.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      path: {
        type: DataTypes.STRING(1024),
        allowNull: false,
        unique: true
      },
      referenceCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      sequelize,
      modelName: "MediaFile",
      tableName: "media_files",
      timestamps: true
    }
  );

  return MediaFile;
};
