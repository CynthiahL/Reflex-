import { Router } from 'express';
import { createDeliveryRequest, getDeliveries, updateDeliveryStatus } from '../controllers/deliveryController.js';
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

/**
 * @openapi
 * /api/deliveries/{id}/status:
 *   patch:
 *     summary: Update delivery status
 *     description: Allows an authenticated rider to advance an assigned delivery from Assigned to Picked Up or from Picked Up to Delivered.
 *     tags:
 *       - Deliveries
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID of the delivery
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - next_status
 *             properties:
 *               next_status:
 *                 type: string
 *                 enum:
 *                   - Picked Up
 *                   - Delivered
 *                 example: Picked Up
 *     responses:
 *       200:
 *         description: Delivery status successfully updated.
 *       400:
 *         description: Invalid delivery status transition.
 *       401:
 *         description: Missing or invalid authentication token.
 *       403:
 *         description: Rider is not assigned to this delivery.
 *       404:
 *         description: Delivery not found.
 *       500:
 *         description: Failed to update delivery status.
 */
router.patch(
  '/:id/status',
  grantAccessTo(['rider']),
  updateDeliveryStatus
);

export default router;
