import { Router } from 'express';
import { getConnectivity } from '../controllers/diagnosticsController.js';

const router = Router();

router.get('/connectivity', getConnectivity);

export default router;
