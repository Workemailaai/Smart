"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class JuryParticipantFavorite extends Model {
    static associate(models) {
      JuryParticipantFavorite.belongsTo(models.Contest, { foreignKey: "contestId", as: "contest" });
      JuryParticipantFavorite.belongsTo(models.Jury, { foreignKey: "juryId", as: "jury" });
      JuryParticipantFavorite.belongsTo(models.Participant, { foreignKey: "participantId", as: "participant" });
    }
  }

  JuryParticipantFavorite.init(
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
      }
    },
    {
      sequelize,
      modelName: "JuryParticipantFavorite",
      tableName: "jury_participant_favorites",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["contestId", "juryId", "participantId"]
        }
      ]
    }
  );

  return JuryParticipantFavorite;
};
