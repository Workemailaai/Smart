"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("contests", "contestType", {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: "miss_world"
    });
    await queryInterface.addColumn("contests", "coverImageUrl", {
      type: Sequelize.STRING(512),
      allowNull: true
    });

    await queryInterface.addColumn("participants", "photoUrl", {
      type: Sequelize.STRING(512),
      allowNull: true
    });
    await queryInterface.addColumn("participants", "country", {
      type: Sequelize.STRING(120),
      allowNull: true
    });

    await queryInterface.addColumn("jury", "photoUrl", {
      type: Sequelize.STRING(512),
      allowNull: true
    });
    await queryInterface.addColumn("jury", "position", {
      type: Sequelize.STRING(200),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("contests", "contestType");
    await queryInterface.removeColumn("contests", "coverImageUrl");
    await queryInterface.removeColumn("participants", "photoUrl");
    await queryInterface.removeColumn("participants", "country");
    await queryInterface.removeColumn("jury", "photoUrl");
    await queryInterface.removeColumn("jury", "position");
  }
};
