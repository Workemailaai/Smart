"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Score extends Model {
    static associate(models) {
      Score.belongsTo(models.Contest, { foreignKey: "contestId", as: "contest" });
      Score.belongsTo(models.Jury, { foreignKey: "juryId", as: "jury" });
      Score.belongsTo(models.Participant, { foreignKey: "participantId", as: "participant" });
      Score.belongsTo(models.Criterion, { foreignKey: "criterionId", as: "criterion" });
    }
  }

  Score.init(
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
      juryId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      participantId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      criterionId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      value: {
        type: DataTypes.FLOAT,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "Score",
      tableName: "scores",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["juryId", "participantId", "criterionId"]
        }
      ]
    }
  );

  return Score;
};
