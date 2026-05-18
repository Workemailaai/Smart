"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("participants", "sortOrder", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.sequelize.query(
      `UPDATE participants SET "sortOrder" = id WHERE "sortOrder" = 0`
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("participants", "sortOrder");
  }
};
