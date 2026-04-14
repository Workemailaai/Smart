"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("contests", "status", {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: "in_progress"
    });
    await queryInterface.addColumn("contests", "completedAt", {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("contests", "status");
    await queryInterface.removeColumn("contests", "completedAt");
  }
};
