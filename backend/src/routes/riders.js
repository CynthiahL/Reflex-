import { Router } from 'express';

import { checkAuth } from '../middleware/authMiddleware.js';
import { grantAccessTo } from '../middleware/roleMiddleware.js';

import {
  getRiders,
  assignRider
} from '../controllers/assignmentController.js';

const router = Router();

/**
 * GET /api/riders
 *
 * Dispatcher retrieves available riders.
 */
router.get(
  '/',
  checkAuth(),
  grantAccessTo(['DISPATCHER']),
  getRiders
);

/**
 * PATCH /api/riders/deliveries/:id/assign
 *
 * Dispatcher assigns a rider to a delivery.
 */
router.patch(
  '/deliveries/:id/assign',
  checkAuth(),
  grantAccessTo(['DISPATCHER']),
  assignRider
);

export default router;

