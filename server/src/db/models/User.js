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

    /** Нормализует номер телефона к виду +79991234567 */
    static normalizePhone(phone) {
      const raw = phone != null ? String(phone).trim() : "";
      if (!raw) {
        return "";
      }

      let digits = raw.replace(/\D/g, "");
      if (digits.length === 11 && digits.startsWith("8")) {
        digits = `7${digits.slice(1)}`;
      }

      if (digits.length === 10) {
        digits = `7${digits}`;
      }

      return `+${digits}`;
    }

    /** Валидация регистрации организатора (логин = телефон) */
    static validateSignUpData({ fullName, phone, password }) {
      const name = fullName != null ? String(fullName).trim() : "";
      if (!name) {
        return { isValid: false, error: "Укажите имя или организацию" };
      }
      const normalizedPhone = User.normalizePhone(phone);
      if (!normalizedPhone || normalizedPhone === "+") {
        return { isValid: false, error: "Укажите номер телефона" };
      }
      if (!/^\+7\d{10}$/.test(normalizedPhone)) {
        return { isValid: false, error: "Некорректный номер телефона" };
      }
      if (!password || String(password).length < 6) {
        return { isValid: false, error: "Пароль не короче 6 символов" };
      }
      return { isValid: true, error: null };
    }

    /** Валидация входа (логин = телефон) */
    static validateSignInData({ phone, password }) {
      const normalizedPhone = User.normalizePhone(phone);
      const lg = normalizedPhone != null ? String(normalizedPhone).trim() : "";
      if (!lg || password == null || String(password) === "") {
        return { isValid: false, error: "Укажите логин (телефон) и пароль" };
      }
      if (!/^\+7\d{10}$/.test(lg)) {
        return { isValid: false, error: "Некорректный номер телефона" };
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
      phone: {
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
