"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("jury_participant_comments", {
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
      comment: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: ""
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

    await queryInterface.addIndex("jury_participant_comments", ["contestId", "juryId", "participantId"], {
      unique: true,
      name: "jury_participant_comments_contest_jury_participant_unique"
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("jury_participant_comments");
  }
};
