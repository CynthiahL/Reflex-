-- 002_status_transitions.sql
-- Task 5: Realtime Synchronization & Delivery Status
-- Purpose: Enforce the delivery status state machine at the DATABASE layer,
-- as a second guardrail behind the API-level check in deliveryController.js.
-- This means a bad transition is rejected even if it bypasses the API
-- (direct DB write, bug in controller, admin panel, etc.)

-- 1. Ensure the deliveries table has a status column with the expected values.
--    (Adjust/remove this block if 001_initial_schema.sql already defines it.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deliveries' AND column_name = 'status'
  ) THEN
    ALTER TABLE deliveries
      ADD COLUMN status TEXT NOT NULL DEFAULT 'PENDING';
  END IF;
END $$;

ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_status_check
  CHECK (status IN ('PENDING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'));

-- 2. Trigger function: validates OLD.status -> NEW.status against the
--    single source of truth for the state machine.
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- No-op update (e.g. idempotent retry) is always allowed.
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Terminal state: nothing may change once DELIVERED.
  IF OLD.status = 'DELIVERED' THEN
    RAISE EXCEPTION 'Cannot modify a delivery that is already DELIVERED';
  END IF;

  -- Only these forward transitions are legal.
  IF NOT (
    (OLD.status = 'PENDING'    AND NEW.status = 'ASSIGNED')  OR
    (OLD.status = 'ASSIGNED'   AND NEW.status = 'PICKED_UP') OR
    (OLD.status = 'PICKED_UP'  AND NEW.status = 'DELIVERED')
  ) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;

  -- Assignment integrity: a delivery cannot move to ASSIGNED without a rider_id.
  IF NEW.status = 'ASSIGNED' AND NEW.rider_id IS NULL THEN
    RAISE EXCEPTION 'Cannot set status ASSIGNED without a rider_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach the trigger to the deliveries table.
DROP TRIGGER IF EXISTS enforce_status_transition ON deliveries;

CREATE TRIGGER enforce_status_transition
  BEFORE UPDATE OF status ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION validate_status_transition();

-- 4. Row Level Security: a rider may only update deliveries assigned to them,
--    and only touch the status column (enforced in the API layer for column
--    granularity; RLS here enforces row ownership).
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rider_can_update_own_deliveries ON deliveries;

CREATE POLICY rider_can_update_own_deliveries
  ON deliveries
  FOR UPDATE
  USING (rider_id = auth.uid())
  WITH CHECK (rider_id = auth.uid());

-- 5. Add deliveries table to the Realtime publication so Supabase Realtime
--    broadcasts INSERT/UPDATE events on this table to subscribed clients.
--    Safe to run even if already added.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'deliveries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
  END IF;
END $$;
