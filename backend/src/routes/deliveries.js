const express = require('express');
const router = express.Router();

// Import Cynthia's middleware (adjust path if her file structure differs slightly)
const { authenticate } = require('../middleware/authMiddleware'); 
const { requireRole } = require('../middleware/roleMiddleware');

// Import controller functions
const { createDelivery, getDeliveries } = require('../controllers/deliveryController');

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

// NOTE FOR MEMBER 5 (Elias) & MEMBER 4 (Ebenezer):
// Future endpoints like PATCH /api/deliveries/:id/assign or PATCH /api/deliveries/:id/status 
// should be added below this line in this same file to maintain a clean, unified delivery route.

module.exports = router;