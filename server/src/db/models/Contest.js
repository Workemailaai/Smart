"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Contest extends Model {
    static associate(models) {
      Contest.belongsTo(models.User, { foreignKey: "organizerId", as: "organizer" });
      Contest.hasMany(models.Participant, { foreignKey: "contestId", as: "participants" });
      Contest.hasMany(models.Jury, { foreignKey: "contestId", as: "juryMembers" });
      Contest.hasMany(models.Criterion, { foreignKey: "contestId", as: "criteria" });
      Contest.hasMany(models.Score, { foreignKey: "contestId", as: "scores" });
    }
  }

  Contest.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      organizerId: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "Contest",
      tableName: "contests",
      timestamps: true
    }
  );

  return Contest;
};
