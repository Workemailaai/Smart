"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Participant extends Model {
    static associate(models) {
      Participant.belongsTo(models.Contest, { foreignKey: "contestId", as: "contest" });
      Participant.hasMany(models.Score, { foreignKey: "participantId", as: "scores" });
      Participant.hasMany(models.JuryParticipantComment, {
        foreignKey: "participantId",
        as: "juryComments"
      });
    }
  }

  Participant.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      extraInfo: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      contestId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      photoUrl: {
        type: DataTypes.STRING(512),
        allowNull: true
      },
      country: {
        type: DataTypes.STRING(120),
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Participant",
      tableName: "participants",
      timestamps: true
    }
  );

  return Participant;
};
