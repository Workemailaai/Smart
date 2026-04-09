"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Contest, { foreignKey: "organizerId", as: "organizedContests" });
      User.hasMany(models.Jury, { foreignKey: "userId", as: "juryAssignments" });
      User.hasMany(models.EventTemplate, {
        foreignKey: "organizerId",
        as: "eventTemplates"
      });
    }

    /** Валидация регистрации организатора (логин = email) */
    static validateSignUpData({ fullName, email, password }) {
      const name = fullName != null ? String(fullName).trim() : "";
      if (!name) {
        return { isValid: false, error: "Укажите ФИО" };
      }
      const lg = email != null ? String(email).trim().toLowerCase() : "";
      if (!lg) {
        return { isValid: false, error: "Укажите email (логин)" };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lg)) {
        return { isValid: false, error: "Некорректный email" };
      }
      if (!password || String(password).length < 6) {
        return { isValid: false, error: "Пароль не короче 6 символов" };
      }
      return { isValid: true, error: null };
    }

    /** Валидация входа (логин = email) */
    static validateSignInData({ email, password }) {
      const lg = email != null ? String(email).trim() : "";
      if (!lg || password == null || String(password) === "") {
        return { isValid: false, error: "Укажите логин (email) и пароль" };
      }
      return { isValid: true, error: null };
    }
  }

  User.init(
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
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM("organizer", "jury"),
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      timestamps: true
    }
  );

  return User;
};
