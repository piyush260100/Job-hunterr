import { Router } from 'express';
import {
  getPreferences,
  putPreferences,
} from '../controllers/preferencesController.js';

const router = Router();

router.get('/', getPreferences);
router.put('/', putPreferences);

export default router;
