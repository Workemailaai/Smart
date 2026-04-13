const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const process = require("process");
const multer = require("multer");

const publicRoot = path.resolve(process.cwd(), "public");

/** Создаёт подпапки для загрузок конструктора */
function ensureUploadDirs() {
  ["contests", "participants", "jury"].forEach((sub) => {
    const dir = path.join(publicRoot, sub);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

ensureUploadDirs();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (file.fieldname === "cover") {
        cb(null, path.join(publicRoot, "contests"));
      } else if (file.fieldname.startsWith("participantPhoto_")) {
        cb(null, path.join(publicRoot, "participants"));
      } else if (file.fieldname.startsWith("juryPhoto_")) {
        cb(null, path.join(publicRoot, "jury"));
      } else {
        cb(new Error("Недопустимое поле файла"));
      }
    } catch (err) {
      cb(err);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".jpg";
    const safeExt = ext.length > 10 ? ".jpg" : ext;
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`);
  }
});

/** Загрузка обложки и фото участников/жюри при создании мероприятия */
const uploadContestAssets = multer({ storage });

module.exports = { uploadContestAssets, ensureUploadDirs };
