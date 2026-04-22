"use strict";

/** Отдельный флаг отправки оценок жюри по мероприятию. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("jury", "isSubmitted", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    const [juryRows] = await queryInterface.sequelize.query(
      'SELECT "id", "contestId" FROM "jury"'
    );
    for (const juryRow of juryRows) {
      const contestId = Number(juryRow.contestId);
      const juryId = Number(juryRow.id);
      const [[criteriaCountRow]] = await queryInterface.sequelize.query(
        'SELECT COUNT(*) AS "count" FROM "criteria" WHERE "contestId" = :contestId',
        { replacements: { contestId } }
      );
      const [[participantsCountRow]] = await queryInterface.sequelize.query(
        'SELECT COUNT(*) AS "count" FROM "participants" WHERE "contestId" = :contestId',
        { replacements: { contestId } }
      );
      const expectedScoreCount = Number(criteriaCountRow.count || 0) * Number(participantsCountRow.count || 0);
      if (expectedScoreCount <= 0) continue;

      const [[scoreCountRow]] = await queryInterface.sequelize.query(
        'SELECT COUNT(*) AS "count" FROM "scores" WHERE "contestId" = :contestId AND "juryId" = :juryId',
        { replacements: { contestId, juryId } }
      );
      const scoreCount = Number(scoreCountRow.count || 0);
      if (scoreCount < expectedScoreCount) continue;

      await queryInterface.bulkUpdate(
        "jury",
        { isSubmitted: true },
        { id: juryId }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("jury", "isSubmitted");
  }
};
