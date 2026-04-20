const fs = require("fs");
const path = require("path");
const process = require("process");
const { MediaFile } = require("../db/models");

const MEDIA_PREFIX = "/media/";
const publicRoot = path.resolve(process.cwd(), "public");

class MediaFileService {
  static normalizeMediaPath(rawPath) {
    if (!rawPath) return null;
    const value = String(rawPath).trim();
    if (!value) return null;
    if (value.startsWith(MEDIA_PREFIX)) return value;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      try {
        const url = new URL(value);
        if (url.pathname && url.pathname.startsWith(MEDIA_PREFIX)) {
          return url.pathname;
        }
      } catch (_error) {
        return null;
      }
    }
    return null;
  }

  static uniqMediaPaths(mediaPaths) {
    const uniqueMediaPathSet = new Set();
    for (const mediaPath of mediaPaths || []) {
      const normalizedMediaPath = MediaFileService.normalizeMediaPath(mediaPath);
      if (normalizedMediaPath) {
        uniqueMediaPathSet.add(normalizedMediaPath);
      }
    }
    return [...uniqueMediaPathSet];
  }

  static collectTemplateSnapshotMediaPaths(snapshot) {
    const source = snapshot && typeof snapshot === "object" ? snapshot : {};
    const participantRows = Array.isArray(source.participants) ? source.participants : [];
    const juryRows = Array.isArray(source.jury) ? source.jury : [];
    return MediaFileService.uniqMediaPaths([
      source.coverImageUrl,
      ...participantRows.map((participant) => participant?.photoUrl),
      ...juryRows.map((juryMember) => juryMember?.photoUrl)
    ]);
  }

  static collectContestMediaPaths({ contest, participants, juryMembers }) {
    return MediaFileService.uniqMediaPaths([
      contest?.coverImageUrl,
      ...(Array.isArray(participants) ? participants.map((participant) => participant?.photoUrl) : []),
      ...(Array.isArray(juryMembers) ? juryMembers.map((juryMember) => juryMember?.photoUrl) : [])
    ]);
  }

  static toDiskPath(mediaPath) {
    const normalizedMediaPath = MediaFileService.normalizeMediaPath(mediaPath);
    if (!normalizedMediaPath) return null;
    const relativeMediaPath = normalizedMediaPath.slice(MEDIA_PREFIX.length);
    const resolvedPath = path.resolve(publicRoot, relativeMediaPath);
    if (!resolvedPath.startsWith(publicRoot)) {
      return null;
    }
    return resolvedPath;
  }

  static async incrementReferences(mediaPaths, transaction) {
    const uniqueMediaPaths = MediaFileService.uniqMediaPaths(mediaPaths);
    for (const mediaPath of uniqueMediaPaths) {
      const mediaFileRow = await MediaFile.findOne({
        where: { path: mediaPath },
        transaction,
        lock: transaction?.LOCK?.UPDATE
      });
      if (mediaFileRow) {
        await mediaFileRow.update(
          { referenceCount: Number(mediaFileRow.referenceCount || 0) + 1 },
          { transaction }
        );
        continue;
      }
      await MediaFile.create(
        {
          path: mediaPath,
          referenceCount: 1
        },
        { transaction }
      );
    }
  }

  static async decrementReferences(mediaPaths, transaction) {
    const uniqueMediaPaths = MediaFileService.uniqMediaPaths(mediaPaths);
    const removableMediaPaths = [];
    for (const mediaPath of uniqueMediaPaths) {
      const mediaFileRow = await MediaFile.findOne({
        where: { path: mediaPath },
        transaction,
        lock: transaction?.LOCK?.UPDATE
      });
      if (!mediaFileRow) continue;
      const nextReferenceCount = Number(mediaFileRow.referenceCount || 0) - 1;
      if (nextReferenceCount > 0) {
        await mediaFileRow.update({ referenceCount: nextReferenceCount }, { transaction });
        continue;
      }
      await mediaFileRow.destroy({ transaction });
      removableMediaPaths.push(mediaPath);
    }
    return removableMediaPaths;
  }

  static cleanupFiles(removableMediaPaths) {
    for (const mediaPath of removableMediaPaths || []) {
      try {
        const diskPath = MediaFileService.toDiskPath(mediaPath);
        if (!diskPath) continue;
        if (fs.existsSync(diskPath)) {
          fs.unlinkSync(diskPath);
        }
      } catch (error) {
        console.error("[Медиафайлы] Не удалось удалить файл:", mediaPath, error?.message || error);
      }
    }
  }
}

module.exports = MediaFileService;
