import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../public/uploads');
const evidenceDir = path.join(__dirname, '../private/evidence');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
}

// Konfigurasi penyimpanan file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Format: TIMESTAMP-RANDOM-NAMAAWAL.ext
        // Contoh: 170998822-482193-dompet.jpg
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const extname = /\.(jpe?g|png)$/i.test(path.extname(file.originalname));
    const mimetype = ['image/jpeg', 'image/png'].includes(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    return cb(new Error('Only JPG and PNG images are allowed'));
};

const limits = {
    fileSize: 5 * 1024 * 1024
};

const upload = multer({
    storage,
    limits,
    fileFilter
});

const evidenceStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, evidenceDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
});

export const evidenceUpload = multer({
    storage: evidenceStorage,
    limits,
    fileFilter
});

export default upload;