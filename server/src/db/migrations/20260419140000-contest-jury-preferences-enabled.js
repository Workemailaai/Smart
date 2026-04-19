"use strict";

/** Разрешить жюри менять порядок показателей (при включённой значимости). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("contests", "juryPreferencesEnabled", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("contests", "juryPreferencesEnabled");
  }
};
