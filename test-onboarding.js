// Test helper script for onboarding endpoint
// Uses environment variables for testing; no secrets committed
// Uses native fetch available in Node.js 20+

const BASE_URL = 'http://localhost:5000';
const ADMIN_KEY = process.env.ADMIN_KEY || 'jugnu-admin-dev-2025';
const TOKEN_ID = process.env.TEST_PORTAL_TOKEN_ID || '00000000-0000-4000-8000-000000000000';
const TEST_TOKEN = process.env.TEST_PORTAL_TOKEN || 'test-sample-token-safe';

console.log('Testing onboarding endpoint with different parameter formats...');

// Test 1: With token (hex string)
console.log('\n1. Testing with token (hex):');
try {
  const response1 = await fetch(`${BASE_URL}/api/spotlight/admin/send-onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_KEY
    },
    body: JSON.stringify({
      token: TEST_TOKEN,
      email: "sponsor@example.com"
    })
  });
  
  const data1 = await response1.json();
  console.log('Response:', JSON.stringify(data1, null, 2));
} catch (error) {
  console.error('Error:', error.message);
}

// Test 2: With token_id (UUID format)
console.log('\n2. Testing with token_id:');
try {
  const response2 = await fetch(`${BASE_URL}/api/spotlight/admin/send-onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_KEY
    },
    body: JSON.stringify({
      token_id: TOKEN_ID,
      email: "sponsor@example.com"
    })
  });
  
  const data2 = await response2.json();
  console.log('Response:', JSON.stringify(data2, null, 2));
} catch (error) {
  console.error('Error:', error.message);
}

// Test 3: With no parameters (should fail)
console.log('\n3. Testing with no token parameters (should fail):');
try {
  const response3 = await fetch(`${BASE_URL}/api/spotlight/admin/send-onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_KEY
    },
    body: JSON.stringify({
      email: "sponsor@example.com"
    })
  });
  
  const data3 = await response3.json();
  console.log('Response:', JSON.stringify(data3, null, 2));
} catch (error) {
  console.error('Error:', error.message);
}