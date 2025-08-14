// Quick test script to debug the onboarding endpoint
const { default: fetch } = await import('node-fetch');

const BASE_URL = 'http://localhost:5000';
const ADMIN_KEY = process.env.ADMIN_KEY || 'jugnu-admin-dev-2025';

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
      token: "test-hex-token-123",
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
      token_id: "123e4567-e89b-12d3-a456-426614174000",
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