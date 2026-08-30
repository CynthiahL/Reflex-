/**
 * Rider Assignment Controller
 *
 * Member 4 — Ebenezer
 *
 * Responsibilities:
 * - Retrieve available riders for a dispatcher
 * - Assign a rider to a pending delivery
 * - Ensure only valid riders can be assigned
 * - Move delivery status from PENDING to ASSIGNED
 */

import { supabaseAdmin } from '../config/supabase.js';

/**
 * GET /api/riders
 *
 * Retrieve users whose role is RIDER.
 *
 * Authentication and dispatcher authorization are handled
 * by middleware before this controller is reached.
 */
export const getRiders = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('role', 'RIDER');

    if (error) {
      console.error('Supabase rider retrieval error:', error);

      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to retrieve riders.'
      });
    }

    return res.status(200).json({
      message: 'Riders retrieved successfully',
      data: data || []
    });

  } catch (err) {
    console.error('Unexpected server error in getRiders:', err);

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred.'
    });
  }
};


/**
 * PATCH /api/riders/deliveries/:id/assign
 *
 * Assign a rider to a delivery.
 *
 * Expected request body:
 * {
 *   "rider_id": "uuid"
 * }
 */
export const assignRider = async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const { rider_id } = req.body;
    const user = req.user;

    // Defensive authorization check.
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.'
      });
    }

    if (user.role !== 'DISPATCHER') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only dispatchers can assign riders.'
      });
    }

    // Validate delivery ID.
    if (!deliveryId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Delivery ID is required.'
      });
    }

    // Validate rider ID.
    if (!rider_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'rider_id is required.'
      });
    }

    // Retrieve the delivery.
    const {
      data: delivery,
      error: deliveryError
    } = await supabaseAdmin
      .from('deliveries')
      .select('id, rider_id, status')
      .eq('id', deliveryId)
      .maybeSingle();

    if (deliveryError) {
      console.error('Supabase delivery lookup error:', deliveryError);

      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to retrieve delivery.'
      });
    }

    if (!delivery) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Delivery not found.'
      });
    }

    // Only PENDING deliveries can be assigned.
    if (delivery.status !== 'PENDING') {
      return res.status(409).json({
        error: 'Conflict',
        message:
          `Delivery cannot be assigned because its current status is ${delivery.status}.`
      });
    }

    // Verify that the selected profile exists and is actually a rider.
    const {
      data: rider,
      error: riderError
    } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', rider_id)
      .maybeSingle();

    if (riderError) {
      console.error('Supabase rider lookup error:', riderError);

      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to validate rider.'
      });
    }

    if (!rider) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Rider not found.'
      });
    }

    if (rider.role !== 'RIDER') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'The selected user is not a rider.'
      });
    }

    // Assign the rider and move delivery to ASSIGNED.
    const {
      data: updatedDelivery,
      error: updateError
    } = await supabaseAdmin
      .from('deliveries')
      .update({
        rider_id,
        status: 'ASSIGNED'
      })
      .eq('id', deliveryId)
      .eq('status', 'PENDING')
      .select()
      .single();

    if (updateError) {
      console.error('Supabase assignment update error:', updateError);

      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to assign rider.'
      });
    }

    return res.status(200).json({
      message: 'Rider assigned successfully',
      data: updatedDelivery
    });

  } catch (err) {
    console.error('Unexpected server error in assignRider:', err);

    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred.'
    });
  }
};
