"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("event_templates", "snapshot", {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {}
    });

    await queryInterface.addColumn("jury", "displayName", {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("jury", "displayName");
    await queryInterface.removeColumn("event_templates", "snapshot");
  }
};
