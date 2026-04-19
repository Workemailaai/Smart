"use strict";

/** Индивидуальный порядок критериев для члена жюри (массив id критериев). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("jury", "criterionOrder", {
      type: Sequelize.JSON,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("jury", "criterionOrder");
  }
};
