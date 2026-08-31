const express = require('express');
const router = express.Router();

// Import Cynthia's middleware (adjust path if her file structure differs slightly)
const { authenticate } = require('../middleware/authMiddleware'); 
const { requireRole } = require('../middleware/roleMiddleware');

// Import controller functions
const { createDelivery, getDeliveries, updateDeliveryStatus } = require('../controllers/deliveryController');

/**
 * POST /api/deliveries
 * Create a new delivery request.
 * Requires authentication AND the 'RETAILER' role.
 */
router.post('/', authenticate, requireRole(['RETAILER']), createDelivery);

/**
 * GET /api/deliveries
 * Retrieve deliveries.
 * Requires authentication. Filtering is handled dynamically in the controller based on req.user.role.
 */
router.get('/', authenticate, getDeliveries);
/**
 * PATCH /api/deliveries/:id/status
 * Rider updates delivery status: ASSIGNED -> PICKED_UP -> DELIVERED.
 * Requires authentication AND the 'RIDER' role.
 */
router.patch('/:id/status', authenticate, requireRole(['RIDER']), updateDeliveryStatus);

module.exports = router;