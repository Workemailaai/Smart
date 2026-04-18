"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("participants", "extraInfo", {
      type: Sequelize.TEXT,
      allowNull: true
    });
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === "postgres") {
      await queryInterface.sequelize.query(
        `UPDATE "participants" SET "extraInfo" = "age"::text WHERE "age" IS NOT NULL`
      );
    } else if (dialect === "sqlite") {
      await queryInterface.sequelize.query(
        `UPDATE participants SET extraInfo = CAST(age AS TEXT) WHERE age IS NOT NULL`
      );
    } else {
      await queryInterface.sequelize.query(
        `UPDATE participants SET extraInfo = CAST(age AS CHAR) WHERE age IS NOT NULL`
      );
    }
    await queryInterface.removeColumn("participants", "age");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("participants", "extraInfo");
    await queryInterface.addColumn("participants", "age", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 18
    });
  }
};
