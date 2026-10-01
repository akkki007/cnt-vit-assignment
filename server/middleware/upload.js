const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ALLOWED_EXT = new Set([
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  '.zip', '.rar', '.png', '.jpg', '.jpeg', '.txt', '.md',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function makeStorage(subfolder) {
  const dest = path.join(__dirname, '..', 'uploads', subfolder);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${unique}${ext}`);
    },
  });
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    const err = new Error(`File type "${ext}" is not allowed.`);
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
}

const uploadSubmission = multer({
  storage: makeStorage('submissions'),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 5 },
});

const uploadResource = multer({
  storage: makeStorage('resources'),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 3 },
});

module.exports = { uploadSubmission, uploadResource };
