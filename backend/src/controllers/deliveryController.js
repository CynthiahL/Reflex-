const { createClient } = require('@supabase/supabase-js');

// Assumes Cynthia has configured this with the SERVICE ROLE key for admin bypass
const supabase = require('../config/supabase'); 

/**
 * Create a new delivery request.
 * Only accessible to authenticated RETAILERS.
 */
const createDelivery = async (req, res) => {
  try {
    // 1. Obtain authenticated user identity (provided by Cynthia's authMiddleware)
    const user = req.user;

    if (!user || user.role !== 'RETAILER') {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Only retailers can create delivery requests.' 
      });
    }

    // 2. Validate required input
    const { customer_name, customer_phone, address, item_description } = req.body;

    if (!customer_name || !customer_phone || !address || !item_description) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Missing required fields: customer_name, customer_phone, address, item_description' 
      });
    }

    // 3. Insert delivery into Supabase
    // Note: We do NOT pass 'status' or 'rider_id'. The database defaults handle this.
    const { data, error } = await supabase
      .from('deliveries')
      .insert({
        retailer_id: user.id, // Force association with the authenticated retailer
        customer_name,
        customer_phone,
        address,
        item_description
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase delivery creation error:', error);
      return res.status(500).json({ 
        error: 'Database Error', 
        message: 'Failed to create delivery request.' 
      });
    }

    // 4. Return successful response
    return res.status(201).json({
      message: 'Delivery request created successfully',
      data: data
    });

  } catch (err) {
    console.error('Unexpected server error in createDelivery:', err);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'An unexpected error occurred.' 
    });
  }
};

/**
 * Retrieve deliveries based on the authenticated user's role.
 */
const getDeliveries = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }

    let query = supabase.from('deliveries').select('*');

    // Role-based filtering logic
    if (user.role === 'RETAILER') {
      // Retailers only see their own deliveries
      query = query.eq('retailer_id', user.id);
    } else if (user.role === 'RIDER') {
      // Riders only see deliveries assigned to them
      query = query.eq('rider_id', user.id);
    } else if (user.role === 'DISPATCHER') {
      // Dispatchers see all deliveries (can be further filtered by query params if needed)
      // Ordering by newest first is helpful for dispatchers
      query = query.order('created_at', { ascending: false });
    } else {
      return res.status(403).json({ error: 'Forbidden', message: 'Invalid user role.' });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase delivery retrieval error:', error);
      return res.status(500).json({ 
        error: 'Database Error', 
        message: 'Failed to retrieve deliveries.' 
      });
    }

    return res.status(200).json({
      message: 'Deliveries retrieved successfully',
      data: data || []
    });

  } catch (err) {
    console.error('Unexpected server error in getDeliveries:', err);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'An unexpected error occurred.' 
    });
  }
};

module.exports = {
  createDelivery,
  getDeliveries
};