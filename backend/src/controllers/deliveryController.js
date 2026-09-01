import { supabaseAdmin } from '../config/supabase.js';

// POST /api/deliveries
export const createDeliveryRequest = async (req, res) => {
  const {
    customer_name,
    customer_phone,
    delivery_address,
    item_description,
    rider_id,
    payment_confirmed
  } = req.body;

  // Validate required request fields
  if (
    !customer_name ||
    !customer_phone ||
    !delivery_address ||
    !item_description
  ) {
    return res.status(400).json({
      error: 'All core customer fields are required.'
    });
  }

  try {
    // Generate tracking reference
    const reference_number = `REF-${Math.floor(
      100000 + Math.random() * 900000
    )}`;

    // Determine initial delivery state
    const initialStatus = rider_id ? 'Assigned' : 'Pending';

    // Create delivery
    const { data, error } = await supabaseAdmin
      .from('deliveries')
      .insert({
        reference_number,
        retailer_id: req.user.id,
        rider_id: rider_id || null,
        customer_name,
        customer_phone,
        delivery_address,
        item_description,
        status: initialStatus,
        payment_confirmed: Boolean(payment_confirmed),
        assigned_at: rider_id ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (error) {
      console.error('Delivery insert failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });

      return res.status(500).json({
        error: 'Failed to create delivery',
        details: error.message
      });
    }

    // Update assigned rider status
    if (rider_id) {
      const { error: riderUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({
          live_status: 'In Transit'
        })
        .eq('id', rider_id)
        .eq('role', 'rider');

      if (riderUpdateError) {
        console.error(
          'Delivery created but rider status update failed:',
          riderUpdateError
        );

        // Do not fail delivery creation because secondary update failed
        return res.status(201).json({
          message: 'Order created and dispatched',
          delivery: data,
          warning: 'Rider status could not be updated'
        });
      }
    }

    return res.status(201).json({
      message: 'Order created and dispatched',
      delivery: data
    });

  } catch (error) {
    console.error('Unexpected delivery creation error:', error);

    return res.status(500).json({
      error: 'Failed to create delivery',
      details: error.message
    });
  }
};


// GET /api/deliveries
export const getDeliveries = async (req, res) => {
  try {
    let query = supabaseAdmin
      .from('deliveries')
      .select('*');

    // Retailer: own deliveries
    if (req.user.role === 'retailer') {
      query = query.eq('retailer_id', req.user.id);
    }

    // Rider: assigned deliveries only
    else if (req.user.role === 'rider') {
      query = query.eq('rider_id', req.user.id);
    }

    // Fetch records
    const { data: records, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Delivery retrieval failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });

      return res.status(500).json({
        error: 'Failed to fetch deliveries record library'
      });
    }

    // Privacy safeguard
    const processedDeliveries = records.map((order) => {
      if (
        req.user.role === 'rider' &&
        (order.status === 'Delivered' ||
          order.status === 'Cancelled')
      ) {
        return {
          ...order,
          customer_phone: '07** *** ***',
          delivery_address: 'Redacted from history'
        };
      }

      return order;
    });

    return res.status(200).json({
      deliveries: processedDeliveries
    });

  } catch (error) {
    console.error(
      'Unexpected delivery retrieval error:',
      error
    );

    return res.status(500).json({
      error: 'Failed to fetch deliveries record library'
    });
  }
};


// PATCH /api/deliveries/:id/status
export const updateDeliveryStatus = async (req, res) => {
  const { id } = req.params;
  const { next_status } = req.body;

  // Only valid rider progression states
  const allowedStatuses = [
    'Picked Up',
    'Delivered'
  ];

  if (!next_status || !allowedStatuses.includes(next_status)) {
    return res.status(400).json({
      error: 'Invalid delivery status transition.'
    });
  }

  try {
    // Retrieve the delivery first
    const { data: delivery, error: deliveryError } =
      await supabaseAdmin
        .from('deliveries')
        .select('id, rider_id, status')
        .eq('id', id)
        .single();

    if (deliveryError || !delivery) {
      return res.status(404).json({
        error: 'Delivery not found.'
      });
    }

    // Security check:
    // A rider may only update deliveries assigned to them
    if (delivery.rider_id !== req.user.id) {
      return res.status(403).json({
        error: 'You are not assigned to this delivery.'
      });
    }

    // Enforce sequential status transitions
    if (
      delivery.status === 'Assigned' &&
      next_status !== 'Picked Up'
    ) {
      return res.status(400).json({
        error: `Invalid status transition from ${delivery.status} to ${next_status}.`
      });
    }

    if (
      delivery.status === 'Picked Up' &&
      next_status !== 'Delivered'
    ) {
      return res.status(400).json({
        error: `Invalid status transition from ${delivery.status} to ${next_status}.`
      });
    }

    // Prevent updates from already completed/cancelled states
    if (
      delivery.status !== 'Assigned' &&
      delivery.status !== 'Picked Up'
    ) {
      return res.status(400).json({
        error: `Delivery cannot transition from ${delivery.status}.`
      });
    }

    // Update delivery status
    const {
      data: updatedDelivery,
      error: updateError
    } = await supabaseAdmin
      .from('deliveries')
      .update({
        status: next_status
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error(
        'Delivery status update failed:',
        updateError
      );

      return res.status(500).json({
        error: 'Failed to update delivery status'
      });
    }

    // Once delivered, rider becomes available again
    if (next_status === 'Delivered') {
      const { error: riderError } = await supabaseAdmin
        .from('profiles')
        .update({
          live_status: 'Available'
        })
        .eq('id', req.user.id)
        .eq('role', 'rider');

      if (riderError) {
        console.error(
          'Rider status reset failed:',
          riderError
        );

        // Delivery status was successfully updated,
        // so don't turn the whole request into a failure.
        return res.status(200).json({
          message: 'Delivery marked as delivered',
          delivery: updatedDelivery,
          warning: 'Rider availability could not be reset'
        });
      }
    }

    return res.status(200).json({
      message: 'Delivery status updated successfully',
      delivery: updatedDelivery
    });

  } catch (error) {
    console.error(
      'Unexpected delivery status update error:',
      error
    );

    return res.status(500).json({
      error: 'Failed to update delivery status'
    });
  }
};