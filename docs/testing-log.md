# Testing Log — Task 5: Realtime Sync & Delivery Status

Use this to record the deliberate edge-case tests before Day 3 (Mock Panel).
Fill in the Result column after actually running each test against the
deployed build — this becomes your "Evidence" layer for cross-exam answers.

| # | Test | Steps | Expected Result | Actual Result | Pass/Fail |
|---|------|-------|------------------|----------------|-----------|
| 1 | Valid transition | Rider moves ASSIGNED → PICKED_UP via UI | Status updates, retailer dashboard reflects change with no refresh | | |
| 2 | Invalid transition (API) | Send PATCH with status=DELIVERED on a PENDING delivery via Postman | 409 response, status unchanged in DB | | |
| 3 | Invalid transition (DB bypass) | Attempt direct SQL UPDATE setting PENDING → DELIVERED | Trigger raises exception, write rejected | | |
| 4 | Wrong rider | Rider A calls PATCH status endpoint on a delivery assigned to Rider B | 403 response | | |
| 5 | Non-rider role | Dispatcher account calls PATCH status endpoint | 403 response | | |
| 6 | Double-tap / idempotency | Rider taps "Mark Picked Up" twice quickly | Second request returns 200 no-op, no duplicate write/broadcast | | |
| 7 | Concurrent assignment | Two dispatcher sessions both assign a rider to the same PENDING delivery within ~1s | Only one succeeds; second gets rejected/stale-state error | | |
| 8 | Realtime propagation | Update status as rider, watch retailer dashboard in a separate browser | Retailer UI updates within ~1-2s with no manual refresh | | |
| 9 | Connection drop | Disable network on retailer's browser tab, update status from rider elsewhere, re-enable network | Document actual behavior — dashboard likely stays stale until manual refresh (known trade-off, see log entry #1) | | |
| 10 | Terminal state lock | Attempt any update on a DELIVERED delivery | Rejected at both API and DB layer | | |

**Timing data (from Day 2 dry run):**
- Time to explain realtime architecture live: ___ min
- Slides covering this segment: ___
- Questions this section drew in first dry run: ___
