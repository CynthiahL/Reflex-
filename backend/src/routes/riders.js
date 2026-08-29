const express = require('express');

const router = express.Router();

const { authenticate } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const {
  getRiders,
  assignRider
} = require('../controllers/assignmentController');


/**
 * GET /api/riders
 *
 * Dispatcher retrieves available riders.
 */
router.get(
  '/riders',
  authenticate,
  requireRole(['DISPATCHER']),
  getRiders
);


/**
 * PATCH /api/deliveries/:id/assign
 *
 * Dispatcher assigns a rider to a delivery.
 */
router.patch(
  '/deliveries/:id/assign',
  authenticate,
  requireRole(['DISPATCHER']),
  assignRider
);


module.exports = router;

