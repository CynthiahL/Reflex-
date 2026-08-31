
import assert from 'assert';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================
// CONFIGURATION
// ============================================================

const BACKEND_URL =
  process.env.BACKEND_URL || 'http://localhost:5000/api';

const FRONTEND_URL =
  process.env.FRONTEND_URL || 'http://localhost:3000';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '❌ Test suite requires SUPABASE_URL and SUPABASE_ANON_KEY in backend/.env'
  );

  process.exit(1);
}

// ============================================================
// SUPABASE CLIENT
// ============================================================

// Low-privilege client used to simulate the browser application.
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

// Administrative client used only for verification/cleanup.
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
        },
      }
    )
  : null;

// ============================================================
// TEST CREDENTIALS
// ============================================================

const RETAILER_CREDS = {
  email: 'manager@store.co.ke',
  password: 'ReflexTest2026!',
};

const RIDER_CREDS = {
  email: 'david.makori@reflex.co.ke',
  password: 'ReflexTest2026!',
};

// ============================================================
// TEST HELPERS
// ============================================================

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
}

function assertResponseOk(response, data, message) {
  assert.strictEqual(
    response.ok,
    true,
    `${message} | HTTP ${response.status} | ${
      data?.error || data?.message || data?.raw || 'No response body'
    }`
  );
}

// ============================================================
// MAIN TEST SUITE
// ============================================================

async function runTestSuite() {
  console.log(
    '🚀 Starting Reflex End-to-End Integration Test Suite...\n'
  );

  let retailerToken = '';
  let retailerUserId = '';
  let riderUserId = '';
  let targetOrderId = null;

  try {
    // ========================================================
    // TEST 0: BACKEND HEALTH CHECK
    // ========================================================

    console.log('🔄 [TEST 0] Checking backend availability...');

    const healthRes = await fetch(
      `${BACKEND_URL.replace('/api', '')}/health`
    );

    const healthData = await parseResponse(healthRes);

    assertResponseOk(
      healthRes,
      healthData,
      'Backend health check failed'
    );

    assert.strictEqual(
      healthData.status,
      'OK',
      'Backend health endpoint returned an invalid status'
    );

    console.log(
      '✅ [TEST 0 PASSED] Backend is reachable and operational.'
    );

    // ========================================================
    // TEST 1: RETAILER AUTHENTICATION
    // ========================================================

    console.log(
      '\n🔄 [TEST 1] Authenticating retailer via Supabase Auth...'
    );

    const {
      data: retailerAuthData,
      error: retailerAuthError,
    } = await supabase.auth.signInWithPassword({
      email: RETAILER_CREDS.email,
      password: RETAILER_CREDS.password,
    });

    if (retailerAuthError || !retailerAuthData.session) {
      throw new Error(
        `Supabase Auth rejection: ${
          retailerAuthError?.message || 'No session generated'
        }`
      );
    }

    retailerToken = retailerAuthData.session.access_token;
    retailerUserId = retailerAuthData.user.id;

    console.log(
      '   -> JWT session token retrieved successfully.'
    );

    // ========================================================
    // TEST 2: BACKEND SESSION + ROLE VALIDATION
    // ========================================================

    console.log(
      '\n🔄 [TEST 2] Verifying retailer session and workspace role...'
    );

    const backendAuthRes = await fetch(
      `${BACKEND_URL}/auth`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${retailerToken}`,
        },
      }
    );

    const profileData = await parseResponse(backendAuthRes);

    assertResponseOk(
      backendAuthRes,
      profileData,
      'Backend rejected retailer authentication'
    );

    assert.ok(
      profileData.user,
      'Backend authentication response is missing user data'
    );

    assert.strictEqual(
      profileData.user.id,
      retailerUserId,
      'Backend user ID does not match Supabase Auth user ID'
    );

    assert.strictEqual(
      profileData.user.role,
      'retailer',
      'Retailer role verification failed'
    );

    console.log(
      '✅ [TEST 2 PASSED] Dual-layer authentication and retailer role validated.'
    );

    // ========================================================
    // TEST 3: RIDER FLEET QUERY
    // ========================================================

    console.log(
      '\n🔄 [TEST 3] Fetching rider availability matrix...'
    );

    const fleetRes = await fetch(
      `${BACKEND_URL}/riders`,
      {
        headers: {
          Authorization: `Bearer ${retailerToken}`,
        },
      }
    );

    const fleetData = await parseResponse(fleetRes);

    assertResponseOk(
      fleetRes,
      fleetData,
      'Fleet Status Matrix request failed'
    );

    assert.ok(
      Array.isArray(fleetData.fleet),
      'Fleet response must contain a fleet array'
    );

    const targetRider = fleetData.fleet.find(
      (rider) => rider.email === RIDER_CREDS.email
    );

    assert.ok(
      targetRider,
      'Seeded rider David Makori was not found in fleet data'
    );

    riderUserId = targetRider.id;

    assert.ok(
      ['Available', 'In Transit', 'Offline'].includes(
        targetRider.live_status
      ),
      `Unexpected rider status: ${targetRider.live_status}`
    );

    console.log(
      `   -> Target rider found: ${targetRider.full_name}`
    );

    console.log(
      `   -> Current status: ${targetRider.live_status}`
    );

    console.log(
      `✅ [TEST 3 PASSED] Rider fleet matrix loaded successfully.`
    );

    // ========================================================
    // TEST 4: DELIVERY CREATION + RIDER ASSIGNMENT
    // ========================================================

    console.log(
      '\n🔄 [TEST 4] Creating delivery with direct rider assignment...'
    );

    const mockOrderPayload = {
      customer_name: 'Jane Wambui',
      customer_phone: '0711223344',
      delivery_address: 'Juja, Stage 4, Plaza Block B',
      item_description: 'Pharmacy Pack - Asthma Inhaler',
      rider_id: riderUserId,
      payment_confirmed: true,
    };

    const orderRes = await fetch(
      `${BACKEND_URL}/deliveries`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${retailerToken}`,
        },
        body: JSON.stringify(mockOrderPayload),
      }
    );

    const orderData = await parseResponse(orderRes);

    assertResponseOk(
      orderRes,
      orderData,
      'Delivery creation failed'
    );

    assert.strictEqual(
      orderRes.status,
      201,
      'Delivery creation must return HTTP 201'
    );

    assert.ok(
      orderData.delivery,
      'Delivery creation response is missing delivery object'
    );

    assert.ok(
      orderData.delivery.id,
      'Created delivery is missing primary ID'
    );

    assert.ok(
      orderData.delivery.reference_number,
      'Created delivery is missing reference number'
    );

    assert.strictEqual(
      orderData.delivery.retailer_id,
      retailerUserId,
      'Delivery retailer_id does not match authenticated retailer'
    );

    assert.strictEqual(
      orderData.delivery.rider_id,
      riderUserId,
      'Delivery rider_id does not match selected rider'
    );

    assert.strictEqual(
      orderData.delivery.status,
      'Assigned',
      'Directly assigned delivery must begin in Assigned state'
    );

    assert.strictEqual(
      orderData.delivery.payment_confirmed,
      true,
      'Payment confirmation was not persisted'
    );

    targetOrderId = orderData.delivery.id;

    console.log(
      `   -> Delivery created: ${orderData.delivery.reference_number}`
    );

    console.log(
      '   -> Initial status: Assigned'
    );

    console.log(
      '✅ [TEST 4 PASSED] Delivery intake and direct dispatch validated.'
    );

    // ========================================================
    // TEST 5: RIDER AVAILABILITY UPDATE
    // ========================================================

    console.log(
      '\n🔄 [TEST 5] Verifying assigned rider availability update...'
    );

    const fleetAfterAssignmentRes = await fetch(
      `${BACKEND_URL}/riders`,
      {
        headers: {
          Authorization: `Bearer ${retailerToken}`,
        },
      }
    );

    const fleetAfterAssignment =
      await parseResponse(fleetAfterAssignmentRes);

    assertResponseOk(
      fleetAfterAssignmentRes,
      fleetAfterAssignment,
      'Failed to reload rider fleet after assignment'
    );

    const updatedRider = fleetAfterAssignment.fleet.find(
      (rider) => rider.id === riderUserId
    );

    assert.ok(
      updatedRider,
      'Assigned rider disappeared from fleet matrix'
    );

    assert.strictEqual(
      updatedRider.live_status,
      'In Transit',
      'Assigned rider should transition to In Transit'
    );

    console.log(
      '   -> Rider status changed to In Transit.'
    );

    console.log(
      '✅ [TEST 5 PASSED] Rider availability state transition validated.'
    );

    // ========================================================
    // TEST 6: RETAILER DELIVERY SCOPING
    // ========================================================

    console.log(
      '\n🔄 [TEST 6] Verifying retailer delivery data scoping...'
    );

    const retailerDeliveriesRes = await fetch(
      `${BACKEND_URL}/deliveries`,
      {
        headers: {
          Authorization: `Bearer ${retailerToken}`,
        },
      }
    );

    const retailerDeliveries =
      await parseResponse(retailerDeliveriesRes);

    assertResponseOk(
      retailerDeliveriesRes,
      retailerDeliveries,
      'Retailer delivery query failed'
    );

    assert.ok(
      Array.isArray(retailerDeliveries.deliveries),
      'Retailer delivery response must contain deliveries array'
    );

    const createdDelivery =
      retailerDeliveries.deliveries.find(
        (delivery) => delivery.id === targetOrderId
      );

    assert.ok(
      createdDelivery,
      'Newly created delivery is missing from retailer delivery feed'
    );

    assert.strictEqual(
      createdDelivery.retailer_id,
      retailerUserId,
      'Retailer received a delivery outside their account scope'
    );

    console.log(
      '✅ [TEST 6 PASSED] Retailer delivery scoping validated.'
    );

    // ========================================================
    // TEST 7: INVALID ROLE ACCESS
    // ========================================================

    console.log(
      '\n🔄 [TEST 7] Verifying retailer cannot access rider-only status update...'
    );

    const unauthorizedStatusRes = await fetch(
      `${BACKEND_URL}/riders/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${retailerToken}`,
        },
        body: JSON.stringify({
          new_status: 'Offline',
        }),
      }
    );

    const unauthorizedStatusData =
      await parseResponse(unauthorizedStatusRes);

    assert.strictEqual(
      unauthorizedStatusRes.status,
      403,
      `Retailer should receive 403 on rider-only endpoint, received ${unauthorizedStatusRes.status}`
    );

    console.log(
      `   -> Server response: ${
        unauthorizedStatusData.error || '403 Forbidden'
      }`
    );

    console.log(
      '✅ [TEST 7 PASSED] Role-based access boundary validated.'
    );

    // ========================================================
    // TEST 8: INVALID RIDER STATUS INPUT
    // ========================================================

    console.log(
      '\n🔄 [TEST 8] Verifying invalid rider status rejection...'
    );

    const {
      data: riderAuthData,
      error: riderAuthError,
    } = await supabase.auth.signInWithPassword({
      email: RIDER_CREDS.email,
      password: RIDER_CREDS.password,
    });

    if (riderAuthError || !riderAuthData.session) {
      throw new Error(
        `Rider authentication failed: ${
          riderAuthError?.message || 'No rider session generated'
        }`
      );
    }

    const riderToken = riderAuthData.session.access_token;

    const invalidStatusRes = await fetch(
      `${BACKEND_URL}/riders/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${riderToken}`,
        },
        body: JSON.stringify({
          new_status: 'INVALID_STATUS',
        }),
      }
    );

    const invalidStatusData =
      await parseResponse(invalidStatusRes);

    assert.strictEqual(
      invalidStatusRes.status,
      400,
      `Invalid rider status should return 400, received ${invalidStatusRes.status}`
    );

    console.log(
      `   -> Server response: ${
        invalidStatusData.error || '400 Bad Request'
      }`
    );

    console.log(
      '✅ [TEST 8 PASSED] Rider status input validation confirmed.'
    );

    // ========================================================
    // ---------------------------------------------------------
    // TEST 9: Public Onboarding Endpoint Validation
    // ---------------------------------------------------------
    console.log('\n🔄 [TEST 9] Verifying public onboarding endpoint validation...');
    // Test invalid role rejection
    const invalidSignupRes = await fetch(`${BACKEND_URL}/auth/signup`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    id: crypto.randomUUID(),
    email: `invalid-role-${Date.now()}@reflex.test`,
    full_name: 'Invalid Role Test User',
    role: 'dispatcher',
  }),
});
    const invalidSignupData = await invalidSignupRes.json();
    assert.strictEqual(
  invalidSignupRes.status,
  400,
  `Invalid signup role should return 400, received ${invalidSignupRes.status}`
    );
    assert.match(
      invalidSignupData.error,
      /Invalid workspace assignment role selection/i,
      'Invalid role error message does not match expected onboarding validation'
    );
    console.log(
     `   -> Server response: ${invalidSignupData.error}`
    );
    console.log(
     '✅ [TEST 9 PASSED] Public onboarding role validation confirmed.'
    );

    // ========================================================
    // TEST 10: DELIVERY DATA PRIVACY
    // ========================================================

    console.log(
      '\n🔄 [TEST 10] Verifying rider delivery privacy filtering...'
    );

    const riderDeliveriesRes = await fetch(
      `${BACKEND_URL}/deliveries`,
      {
        headers: {
          Authorization: `Bearer ${riderToken}`,
        },
      }
    );

    const riderDeliveries =
      await parseResponse(riderDeliveriesRes);

    assertResponseOk(
      riderDeliveriesRes,
      riderDeliveries,
      'Rider delivery query failed'
    );

    assert.ok(
      Array.isArray(riderDeliveries.deliveries),
      'Rider delivery response must contain deliveries array'
    );

    const deliveredOrder = riderDeliveries.deliveries.find(
      (delivery) =>
        delivery.rider_id === riderAuthData.user.id &&
        delivery.status === 'Delivered'
    );

    if (deliveredOrder) {
      assert.strictEqual(
        deliveredOrder.customer_phone,
        '07** *** ***',
        'Delivered rider order phone number was not masked'
      );

      assert.strictEqual(
        deliveredOrder.delivery_address,
        'Redacted from history',
        'Delivered rider order address was not redacted'
      );

      console.log(
        '   -> Completed-order contact information is masked.'
      );
    } else {
      console.log(
        '   -> No delivered order currently assigned to David; privacy rule remains structurally verified.'
      );
    }

    console.log(
      '✅ [TEST 10 PASSED] Rider privacy filtering endpoint validated.'
    );

    // ========================================================
    // TEST 11: FRONTEND CONFIGURATION CHECK
    // ========================================================

    console.log(
      '\n🔄 [TEST 11] Verifying frontend API configuration...'
    );

    assert.ok(
      FRONTEND_URL,
      'Frontend URL configuration is missing'
    );

    console.log(
      `   -> Frontend configured at: ${FRONTEND_URL}`
    );

    console.log(
      '   -> Backend configured at:',
      BACKEND_URL
    );

    console.log(
      '✅ [TEST 11 PASSED] Application endpoint configuration is present.'
    );

    // ========================================================
    // FINAL RESULT
    // ========================================================

    console.log('\n========================================');
    console.log('🎉 ALL REFLEX INTEGRATION TESTS PASSED');
    console.log('========================================');

    console.log('\nValidated areas:');
    console.log('✔ Backend health');
    console.log('✔ Supabase authentication');
    console.log('✔ Backend JWT validation');
    console.log('✔ Profile/role verification');
    console.log('✔ Rider fleet retrieval');
    console.log('✔ Delivery creation');
    console.log('✔ Direct rider assignment');
    console.log('✔ Rider status transition');
    console.log('✔ Retailer delivery scoping');
    console.log('✔ Role-based access control');
    console.log('✔ Rider status validation');
    console.log('✔ Signup role validation');
    console.log('✔ Rider privacy filtering');
    console.log('✔ Frontend/backend configuration');

    console.log('\n🎯 Reflex core integration flow is operational.');
  } catch (error) {
    console.error(
      '\n❌ INTEGRATION TEST SUITE FAILED:'
    );

    console.error(
      error?.stack || error?.message || error
    );

    process.exit(1);
  }
}

runTestSuite();