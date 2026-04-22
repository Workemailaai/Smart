"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Jury extends Model {
    static associate(models) {
      Jury.belongsTo(models.Contest, { foreignKey: "contestId", as: "contest" });
      Jury.belongsTo(models.User, { foreignKey: "userId", as: "user" });
      Jury.hasMany(models.Score, { foreignKey: "juryId", as: "scores" });
      Jury.hasMany(models.JuryParticipantComment, { foreignKey: "juryId", as: "participantComments" });
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
      },
      displayName: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      /** Порядок приоритета критериев для этого жюри в конкурсе (массив id критериев) */
      criterionOrder: {
        type: DataTypes.JSON,
        allowNull: true
      },
      /** Флаг отправки оценок жюри по мероприятию */
      isSubmitted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
