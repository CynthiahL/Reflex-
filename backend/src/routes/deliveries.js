import { Router } from 'express';
import { createDeliveryRequest, getDeliveries } from '../controllers/deliveryController.js';
import { checkAuth } from '../middleware/authMiddleware.js';
import { grantAccessTo } from '../middleware/roleMiddleware.js';

const router = Router();

// Enforce global user identification check across all delivery endpoints
router.use(checkAuth());

// POST /api/deliveries -> Only a verified Retailer can log a delivery request
/**
 * @openapi
 * /api/deliveries:
 *   post:
 *     summary: Create a delivery request
 *     description: Creates a delivery request for the authenticated retailer. A rider may optionally be assigned immediately.
 *     tags:
 *       - Deliveries
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDeliveryRequest'
 *     responses:
 *       201:
 *         description: Delivery successfully created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 delivery:
 *                   $ref: '#/components/schemas/Delivery'
 *       400:
 *         description: Required customer or delivery fields are missing.
 *       401:
 *         description: Missing or invalid authentication token.
 *       403:
 *         description: User is not a retailer.
 *       500:
 *         description: Failed to create delivery.
 */
router.post(
  '/',
  grantAccessTo(['retailer']),
  createDeliveryRequest
);

// GET /api/deliveries -> Accessible by all roles, but scoped implicitly by the controller
/**
 * @openapi
 * /api/deliveries:
 *   get:
 *     summary: Retrieve deliveries
 *     description: Returns deliveries scoped according to the authenticated user's role.
 *     tags:
 *       - Deliveries
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deliveries successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deliveries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Delivery'
 *       401:
 *         description: Missing or invalid authentication token.
 *       403:
 *         description: User role is not permitted.
 *       500:
 *         description: Failed to retrieve deliveries.
 */
router.get(
  '/',
  grantAccessTo(['retailer', 'dispatcher', 'rider']),
  getDeliveries
);

export default router;
