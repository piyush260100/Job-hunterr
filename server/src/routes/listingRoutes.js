import { Router } from 'express';
import {
  getListings,
  getListing,
  patchListingStatus,
  tailorListing,
  linkedinSearchUrl,
  portalSearchUrls,
  linkedinFilterOptions,
  buildSearch,
  saveManual,
} from '../controllers/listingController.js';

const router = Router();

router.get('/', getListings);
// Specific routes before the parameterized /:id route.
router.get('/linkedin-search', linkedinSearchUrl);
router.get('/portal-search', portalSearchUrls);
router.get('/linkedin-filters', linkedinFilterOptions);
router.post('/build-search', buildSearch);
router.post('/manual', saveManual);
router.get('/:id', getListing);
router.patch('/:id/status', patchListingStatus);
router.post('/:id/tailor', tailorListing);

export default router;
