-- NOTE: In Supabase, you cannot directly insert plaintext passwords into auth.users via standard SQL.
-- DEVELOPMENT INSTRUCTION: 
-- 1. Go to Supabase Dashboard > Authentication > Users and manually create 4 users.
-- 2. Copy their generated UUIDs and replace the <USER_ID_...> placeholders below.

-- 1. Seed Profiles
INSERT INTO public.profiles (id, role) VALUES
    ('<USER_ID_RETAILER_1>', 'RETAILER'),
    ('<USER_ID_DISPATCHER_1>', 'DISPATCHER'),
    ('<USER_ID_RIDER_1>', 'RIDER'),
    ('<USER_ID_RIDER_2>', 'RIDER');

-- 2. Seed Deliveries
INSERT INTO public.deliveries (retailer_id, rider_id, customer_name, customer_phone, address, item_description, status) VALUES
    -- Pending delivery (no rider assigned yet)
    ('<USER_ID_RETAILER_1>', NULL, 'Wanjiku Kamau', '0712345678', 'Kilimani, Nairobi', 'Samsung 32-inch Smart TV', 'PENDING'),
    
    -- Assigned delivery (Ebenezer's domain)
    ('<USER_ID_RETAILER_1>', '<USER_ID_RIDER_1>', 'Omondi Otieno', '0722987654', 'Westlands, Nairobi', 'Office Desk Chair', 'ASSIGNED'),
    
    -- Picked up delivery (Elias's domain)
    ('<USER_ID_RETAILER_1>', '<USER_ID_RIDER_2>', 'Achieng Odhiambo', '0733112233', 'Kajiado Town', 'Box of assorted hardware tools', 'PICKED_UP'),
    
    -- Delivered delivery
    ('<USER_ID_RETAILER_1>', '<USER_ID_RIDER_1>', 'Brian Kipchoge', '0744556677', 'Thika Road Mall', 'HP Laptop 15"', 'DELIVERED');