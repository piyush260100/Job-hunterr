import { Router } from 'express';
import multer from 'multer';
import {
  getProfile,
  putProfile,
  uploadResume,
} from '../controllers/profileController.js';

// Store the upload in memory; we only need the buffer to parse. Limit size to 5MB
// and restrict to PDF at the multer layer (defense in depth; controller re-checks).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Unsupported format. Please upload a PDF.'));
    }
  },
});

const router = Router();

router.get('/', getProfile);
router.put('/', putProfile);
router.post('/resume', upload.single('resume'), uploadResume);

export default router;
