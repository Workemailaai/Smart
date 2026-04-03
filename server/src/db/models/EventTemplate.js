"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class EventTemplate extends Model {
    static associate(models) {
      EventTemplate.belongsTo(models.User, {
        foreignKey: "organizerId",
        as: "organizer"
      });
    }
  }

  EventTemplate.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      criteria: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
      },
      organizerId: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "EventTemplate",
      tableName: "event_templates",
      timestamps: true
    }
  );

  return EventTemplate;
};
