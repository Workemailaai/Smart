"use strict";

function normalizeMediaPath(rawPath) {
  if (!rawPath) return null;
  const value = String(rawPath).trim();
  if (!value) return null;
  if (value.startsWith("/media/")) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      if (url.pathname && url.pathname.startsWith("/media/")) {
        return url.pathname;
      }
    } catch (_error) {
      return null;
    }
  }
  return null;
}

function parseSnapshot(rawSnapshot) {
  if (!rawSnapshot) return {};
  if (typeof rawSnapshot === "string") {
    try {
      return JSON.parse(rawSnapshot);
    } catch (_error) {
      return {};
    }
  }
  if (typeof rawSnapshot === "object") return rawSnapshot;
  return {};
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const mediaUsageCountByPath = new Map();
    const addMediaPath = (rawPath) => {
      const mediaPath = normalizeMediaPath(rawPath);
      if (!mediaPath) return;
      mediaUsageCountByPath.set(mediaPath, Number(mediaUsageCountByPath.get(mediaPath) || 0) + 1);
    };

    const [contestRows] = await queryInterface.sequelize.query(
      `SELECT "coverImageUrl" FROM contests WHERE "coverImageUrl" IS NOT NULL`
    );
    for (const contestRow of contestRows) {
      addMediaPath(contestRow.coverImageUrl);
    }

    const [participantRows] = await queryInterface.sequelize.query(
      `SELECT "photoUrl" FROM participants WHERE "photoUrl" IS NOT NULL`
    );
    for (const participantRow of participantRows) {
      addMediaPath(participantRow.photoUrl);
    }

    const [juryRows] = await queryInterface.sequelize.query(
      `SELECT "photoUrl" FROM jury WHERE "photoUrl" IS NOT NULL`
    );
    for (const juryRow of juryRows) {
      addMediaPath(juryRow.photoUrl);
    }

    const [templateRows] = await queryInterface.sequelize.query(
      `SELECT snapshot FROM event_templates WHERE snapshot IS NOT NULL`
    );
    for (const templateRow of templateRows) {
      const snapshot = parseSnapshot(templateRow.snapshot);
      addMediaPath(snapshot.coverImageUrl);
      const participants = Array.isArray(snapshot.participants) ? snapshot.participants : [];
      const jury = Array.isArray(snapshot.jury) ? snapshot.jury : [];
      for (const participant of participants) {
        addMediaPath(participant?.photoUrl);
      }
      for (const juryMember of jury) {
        addMediaPath(juryMember?.photoUrl);
      }
    }

    if (mediaUsageCountByPath.size === 0) return;
    const now = new Date();
    const rows = [...mediaUsageCountByPath.entries()].map(([path, referenceCount]) => ({
      path,
      referenceCount,
      createdAt: now,
      updatedAt: now
    }));
    await queryInterface.bulkInsert("media_files", rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("media_files", null, {});
  }
};
