"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("event_templates", "contestType", {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: "miss_world"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("event_templates", "contestType");
  }
};
