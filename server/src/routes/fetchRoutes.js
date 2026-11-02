import { Router } from 'express';
import { runFetch } from '../controllers/fetchController.js';

const router = Router();

router.post('/run', runFetch);

export default router;
