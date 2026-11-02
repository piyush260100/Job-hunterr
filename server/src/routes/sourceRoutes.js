import { Router } from 'express';
import { getSources, putSource } from '../controllers/sourceController.js';

const router = Router();

router.get('/', getSources);
router.put('/:key', putSource);

export default router;
