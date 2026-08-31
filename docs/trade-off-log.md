# Trade-off Log — Task 5: Realtime Sync & Delivery Status

## 1. No WebSocket reconnection fallback (polling)

**What it is:** If a client's Supabase Realtime WebSocket connection drops
(e.g. a rider loses signal), `useRealtimeDeliveries` does not automatically
poll the database to catch missed updates. The UI shows a `disconnected`
status but does not self-heal beyond Supabase's built-in client retry.

**Why we accepted it:** Building a robust polling-fallback layer (interval
management, backoff, de-duplication against realtime events once
reconnected) was judged lower priority than proving the core assignment →
status → visibility loop worked at all within the sprint timeline.

**What we'd do differently with more time:** Add a `setInterval` fallback
that activates only when `connectionStatus !== 'connected'` for more than
~10 seconds, refetching deliveries every 30s until the channel reconnects.

---

## 2. Status transitions enforced in two places, not unified in one state library

**What it is:** The transition rules (`PENDING → ASSIGNED → PICKED_UP →
DELIVERED`) are duplicated: once as a JS object in `deliveryController.js`,
and once as SQL logic in the `validate_status_transition()` trigger. There
is no single shared definition.

**Why we accepted it:** The API-level check exists to give fast, specific
error messages; the DB-level trigger exists so the rule can never be
bypassed. Unifying them would require a shared schema/config file consumed
by both Node and Postgres, which added complexity we didn't need for MVP.

**What we'd do differently with more time:** Generate both from a single
JSON/YAML state-machine definition, or adopt a formal state-machine library
(e.g. XState) on the backend that emits the SQL constraint at migration
time.

---

## 3. Idempotency guard is status-only, not request-ID based

**What it is:** A duplicate status update (e.g. a rider double-tapping
"Mark Delivered") is treated as a no-op only because the *resulting*
status matches the current status. This does not protect against two
different in-flight requests racing to make two different valid updates
(e.g. simultaneous PICKED_UP and a manual correction), which relies solely
on the DB transaction to resolve.

**Why we accepted it:** True idempotency (client-generated request IDs,
stored and checked server-side) is standard practice for production
payment/logistics systems but was more infrastructure than an MVP
demo needed to prove the concept.

**What we'd do differently with more time:** Add an `Idempotency-Key`
header pattern: client generates a UUID per action, server stores
recently-seen keys and returns the cached response for repeats.

---

## 4. No conflict resolution UI for concurrent dispatcher actions

**What it is:** Row Level Security and the DB trigger correctly *prevent*
invalid concurrent writes, but the frontend has no UI to explain to a
dispatcher why their action was rejected if another dispatcher acted first
(e.g. "this delivery was already assigned by someone else").

**Why we accepted it:** The backend correctness (rejecting the bad write)
was the priority for MVP; the UX polish of explaining *why* to the user
was deprioritized.

**What we'd do differently with more time:** Surface the specific 409
error from the API in a toast/banner, and auto-refetch the delivery's
current state so the dispatcher sees the up-to-date assignment immediately.
