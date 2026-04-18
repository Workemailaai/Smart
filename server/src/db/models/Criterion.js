"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Criterion extends Model {
    static associate(models) {
      Criterion.belongsTo(models.Contest, { foreignKey: "contestId", as: "contest" });
      Criterion.hasMany(models.Score, { foreignKey: "criterionId", as: "scores" });
    }
  }

  Criterion.init(
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
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      minScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      maxScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10
      }
    },
    {
      sequelize,
      modelName: "Criterion",
      tableName: "criteria",
      timestamps: true
    }
  );

  return Criterion;
};
