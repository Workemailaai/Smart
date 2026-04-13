"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Jury extends Model {
    static associate(models) {
      Jury.belongsTo(models.Contest, { foreignKey: "contestId", as: "contest" });
      Jury.belongsTo(models.User, { foreignKey: "userId", as: "user" });
      Jury.hasMany(models.Score, { foreignKey: "juryId", as: "scores" });
    }
  }

  Jury.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      contestId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      photoUrl: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      position: {
        type: DataTypes.STRING(200),
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Jury",
      tableName: "jury",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["contestId", "userId"]
        }
      ]
    }
  );

  return Jury;
};
