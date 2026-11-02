import { Router } from 'express';
import {
  getPresets,
  postPreset,
  removePreset,
} from '../controllers/searchPresetController.js';

const router = Router();

router.get('/', getPresets);
router.post('/', postPreset);
router.delete('/:id', removePreset);

export default router;
