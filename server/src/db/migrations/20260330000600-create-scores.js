"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("scores", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      contestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "contests",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      juryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "jury",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      participantId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "participants",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      criterionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "criteria",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      value: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW")
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn("NOW")
      }
    });

    await queryInterface.addIndex("scores", ["juryId", "participantId", "criterionId"], {
      unique: true,
      name: "scores_juryId_participantId_criterionId_unique"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("scores");
  }
};
