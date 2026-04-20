"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("media_files", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      path: {
        type: Sequelize.STRING(1024),
        allowNull: false,
        unique: true
      },
      referenceCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
    await queryInterface.addIndex("media_files", ["path"], {
      unique: true,
      name: "media_files_path_unique"
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("media_files");
  }
};
