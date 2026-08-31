import { Router } from 'express';
import { getFleetStatusMatrix, toggleRiderDutyState } from '../controllers/riderController.js';
import { checkAuth } from '../middleware/authMiddleware.js';
import { grantAccessTo } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(checkAuth());

/**
 * @openapi
 * /api/riders:
 *   get:
 *     summary: Get rider fleet availability
 *     description: Returns the current availability status of all registered riders. Requires an authenticated retailer account.
 *     tags:
 *       - Riders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rider fleet successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fleet:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Profile'
 *       401:
 *         description: Missing, invalid, or expired authentication token.
 *       403:
 *         description: Authenticated user does not have retailer privileges.
 *       500:
 *         description: Failed to retrieve rider fleet.
 */
router.get(
  '/',
  grantAccessTo(['retailer']),
  getFleetStatusMatrix
);

/**
 * @openapi
 * /api/riders/status:
 *   patch:
 *     summary: Update rider duty status
 *     description: Allows an authenticated rider to change their own duty status between Available and Offline.
 *     tags:
 *       - Riders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RiderStatusUpdate'
 *     responses:
 *       200:
 *         description: Rider duty status successfully updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Duty status updated
 *                 profile:
 *                   $ref: '#/components/schemas/Profile'
 *       400:
 *         description: Invalid rider status. Only Available or Offline is accepted.
 *       401:
 *         description: Missing, invalid, or expired authentication token.
 *       403:
 *         description: Authenticated user is not a rider.
 *       500:
 *         description: Failed to update rider status.
 */
router.patch(
  '/status',
  grantAccessTo(['rider']),
  toggleRiderDutyState
);

export default router;
