-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Links to Supabase Auth)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('RETAILER', 'DISPATCHER', 'RIDER')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Deliveries Table
CREATE TABLE public.deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retailer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rider_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    address TEXT NOT NULL,
    item_description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for Performance
CREATE INDEX idx_deliveries_retailer_id ON public.deliveries(retailer_id);
CREATE INDEX idx_deliveries_rider_id ON public.deliveries(rider_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);

-- 4. Row Level Security (RLS)
-- Note: Express backend uses Supabase Admin client (bypasses RLS), 
-- but enabling RLS secures the database if the frontend ever queries directly.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Optional but recommended for defense)
CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Retailers can view their own deliveries" 
    ON public.deliveries FOR SELECT USING (auth.uid() = retailer_id);

CREATE POLICY "Riders can view deliveries assigned to them" 
    ON public.deliveries FOR SELECT USING (auth.uid() = rider_id);

-- 5. Trigger to update `updated_at` timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();