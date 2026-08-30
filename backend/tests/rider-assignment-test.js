/**
 * Reflex — Member 4 Rider Assignment Integration Test
 *
 * Tests:
 * 1. Dispatcher can retrieve riders.
 * 2. Dispatcher can assign a rider to a PENDING delivery.
 * 3. Assignment changes delivery status to ASSIGNED.
 *
 * Required environment variables:
 *
 * API_URL
 * DISPATCHER_TOKEN
 * DELIVERY_ID
 * RIDER_ID
 *
 * Example:
 *
 * $env:API_URL="http://localhost:5000"
 * $env:DISPATCHER_TOKEN="your_supabase_access_token"
 * $env:DELIVERY_ID="delivery-uuid"
 * $env:RIDER_ID="rider-uuid"
 *
 * Run:
 * node tests/rider-assignment-test.js
 */

const API_URL = process.env.API_URL || 'http://localhost:5000';
const DISPATCHER_TOKEN = process.env.DISPATCHER_TOKEN;
const DELIVERY_ID = process.env.DELIVERY_ID;
const RIDER_ID = process.env.RIDER_ID;

const requiredVariables = {
  DISPATCHER_TOKEN,
  DELIVERY_ID,
  RIDER_ID
};

const missingVariables = Object.entries(requiredVariables)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVariables.length > 0) {
  console.error(
    `Missing required environment variables: ${missingVariables.join(', ')}`
  );

  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${DISPATCHER_TOKEN}`,
  'Content-Type': 'application/json'
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
};

const testGetRiders = async () => {
  console.log('\nTEST 1: Dispatcher retrieves riders');

  const response = await fetch(`${API_URL}/api/riders`, {
    method: 'GET',
    headers
  });

  const body = await response.json();

  console.log(`Status: ${response.status}`);
  console.log('Response:', body);

  assert(
    response.status === 200,
    `Expected HTTP 200, received ${response.status}`
  );

  assert(
    Array.isArray(body.data),
    'Expected response.data to be an array'
  );

  console.log('PASS: Dispatcher can retrieve riders.');
};

const testAssignRider = async () => {
  console.log('\nTEST 2: Dispatcher assigns rider');

  const response = await fetch(
    `${API_URL}/api/riders/deliveries/${DELIVERY_ID}/assign`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        rider_id: RIDER_ID
      })
    }
  );

  const body = await response.json();

  console.log(`Status: ${response.status}`);
  console.log('Response:', body);

  assert(
    response.status === 200,
    `Expected HTTP 200, received ${response.status}`
  );

  assert(
    body.data?.rider_id === RIDER_ID,
    'Expected delivery rider_id to match selected rider'
  );

  assert(
    body.data?.status === 'ASSIGNED',
    `Expected status ASSIGNED, received ${body.data?.status}`
  );

  console.log('PASS: Rider assigned and delivery moved to ASSIGNED.');
};

const runTests = async () => {
  console.log('========================================');
  console.log('REFLEX RIDER ASSIGNMENT INTEGRATION TEST');
  console.log('========================================');

  try {
    await testGetRiders();
    await testAssignRider();

    console.log('\n========================================');
    console.log('ALL MEMBER 4 TESTS PASSED');
    console.log('========================================');

  } catch (error) {
    console.error('\n========================================');
    console.error('TEST FAILED');
    console.error('========================================');
    console.error(error.message);

    process.exit(1);
  }
};

runTests();
