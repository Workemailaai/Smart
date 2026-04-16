"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class JuryParticipantComment extends Model {
    static associate(models) {
      JuryParticipantComment.belongsTo(models.Contest, { foreignKey: "contestId", as: "contest" });
      JuryParticipantComment.belongsTo(models.Jury, { foreignKey: "juryId", as: "jury" });
      JuryParticipantComment.belongsTo(models.Participant, { foreignKey: "participantId", as: "participant" });
    }
  }

  JuryParticipantComment.init(
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
      comment: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ""
      }
    },
    {
      sequelize,
      modelName: "JuryParticipantComment",
      tableName: "jury_participant_comments",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["contestId", "juryId", "participantId"]
        }
      ]
    }
  );

  return JuryParticipantComment;
};
