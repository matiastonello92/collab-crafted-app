#!/usr/bin/env node

/**
 * Step 6 API Smoke Tests
 * Tests email and invitation APIs with proper authentication
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.SITE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test+saas@yourdomain.tld';

// Ensure output directory exists
const outputDir = path.join(__dirname, '..', 'http');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Helper function for HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Step6-API-Tests/1.0'
      }
    };
    
    const requestOptions = { ...defaultOptions, ...options };
    
    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          json: (() => {
            try {
              return JSON.parse(data);
            } catch {
              return null;
            }
          })()
        });
      });
    });
    
    req.on('error', reject);
    
    if (requestOptions.body) {
      req.write(requestOptions.body);
    }
    
    req.end();
  });
}

// Test 1: Email Test API
async function testEmailAPI() {
  console.log('🧪 Testing Email API...');
  
  const testResult = {
    test: 'POST /api/settings/email-test',
    timestamp: new Date().toISOString(),
    status: 'PENDING'
  };
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/settings/email-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (process.env.TEST_USER_TOKEN || 'missing-token')
      },
      body: JSON.stringify({
        // Empty body - should use current user's email
      })
    });
    
    testResult.statusCode = response.statusCode;
    testResult.response = response.json;
    
    if (response.statusCode === 200 && response.json?.id) {
      testResult.status = 'PASS';
      testResult.messageId = response.json.id;
      console.log('  ✅ Email test API: PASS');
      console.log(`     Message ID: ${response.json.id}`);
    } else {
      testResult.status = 'FAIL';
      testResult.error = response.json?.error || 'No message ID returned';
      console.log('  ❌ Email test API: FAIL');
      console.log(`     Error: ${testResult.error}`);
    }
    
  } catch (error) {
    testResult.status = 'ERROR';
    testResult.error = error.message;
    console.log('  💥 Email test API: ERROR');
    console.log(`     ${error.message}`);
  }
  
  // Write result to file
  fs.writeFileSync(
    path.join(outputDir, 'step6_email_test.out.json'),
    JSON.stringify(testResult, null, 2)
  );
  
  return testResult;
}

// Test 2: Invitation API
async function testInvitationAPI() {
  console.log('🧪 Testing Invitation API...');
  
  const testResult = {
    test: 'POST /api/v1/admin/invitations',
    timestamp: new Date().toISOString(),
    status: 'PENDING'
  };
  
  try {
    // First, get org info for the test
    const orgResponse = await makeRequest(`${BASE_URL}/api/v1/me/permissions`, {
      headers: {
        'Authorization': 'Bearer ' + (process.env.ADMIN_USER_TOKEN || 'missing-admin-token')
      }
    });
    
    // Mock invitation payload
    const invitationPayload = {
      email: TEST_EMAIL,
      role_id: process.env.TEST_ROLE_ID || '00000000-0000-0000-0000-000000000001', // Placeholder
      location_ids: [process.env.TEST_LOCATION_ID || '00000000-0000-0000-0000-000000000001'], // Placeholder
      first_name: 'Test',
      last_name: 'User'
    };
    
    const response = await makeRequest(`${BASE_URL}/api/v1/admin/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (process.env.ADMIN_USER_TOKEN || 'missing-admin-token')
      },
      body: JSON.stringify(invitationPayload)
    });
    
    testResult.statusCode = response.statusCode;
    testResult.response = response.json;
    testResult.payload = invitationPayload;
    
    if ([200, 201].includes(response.statusCode) && response.json?.id) {
      testResult.status = 'PASS';
      testResult.invitationId = response.json.id;
      testResult.token = response.json.token;
      console.log('  ✅ Invitation API: PASS');
      console.log(`     Invitation ID: ${response.json.id}`);
      console.log(`     Email sent to: ${invitationPayload.email}`);
    } else {
      testResult.status = 'FAIL';
      testResult.error = response.json?.error || 'No invitation ID returned';
      console.log('  ❌ Invitation API: FAIL');
      console.log(`     Error: ${testResult.error}`);
    }
    
  } catch (error) {
    testResult.status = 'ERROR';
    testResult.error = error.message;
    console.log('  💥 Invitation API: ERROR');
    console.log(`     ${error.message}`);
  }
  
  // Write result to file
  fs.writeFileSync(
    path.join(outputDir, 'step6_invitation_create.out.json'),
    JSON.stringify(testResult, null, 2)
  );
  
  return testResult;
}

// Main test runner
async function runStep6Tests() {
  console.log('🚀 Starting Step 6 API Smoke Tests...');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Test Email: ${TEST_EMAIL}`);
  console.log('');
  
  const results = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    tests: []
  };
  
  // Run tests
  const emailTest = await testEmailAPI();
  const invitationTest = await testInvitationAPI();
  
  results.tests = [emailTest, invitationTest];
  
  // Summary
  console.log('\n📊 Test Summary:');
  results.tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '💥';
    console.log(`   ${icon} ${test.test}: ${test.status}`);
  });
  
  const passCount = results.tests.filter(t => t.status === 'PASS').length;
  const totalCount = results.tests.length;
  
  results.summary = {
    total: totalCount,
    passed: passCount,
    failed: totalCount - passCount,
    overallStatus: passCount === totalCount ? 'PASS' : 'FAIL'
  };
  
  console.log(`\n🎯 Overall Result: ${results.summary.overallStatus} (${passCount}/${totalCount})`);
  
  // Write full results
  fs.writeFileSync(
    path.join(outputDir, 'step6_api_tests_summary.json'),
    JSON.stringify(results, null, 2)
  );
  
  // Generate text report
  const textReport = `Step 6 API Tests - ${new Date().toISOString()}
==============================================

Base URL: ${BASE_URL}
Test Email: ${TEST_EMAIL}

Results:
--------
${results.tests.map(test => 
  `${test.test}: ${test.status}${test.error ? ` (${test.error})` : ''}`
).join('\n')}

Summary: ${results.summary.overallStatus} (${passCount}/${totalCount} tests passed)
`;
  
  fs.writeFileSync(
    path.join(outputDir, 'step6_api_tests.out.txt'),
    textReport
  );
  
  console.log(`\n📝 Results written to: ${outputDir}/step6_*`);
  
  // Exit with appropriate code
  process.exit(results.summary.overallStatus === 'PASS' ? 0 : 1);
}

// Environment check
if (!process.env.SITE_URL) {
  console.warn('⚠️  SITE_URL not set, using localhost:3000');
}

if (!process.env.ADMIN_USER_TOKEN) {
  console.warn('⚠️  ADMIN_USER_TOKEN not set, invitation test may fail');
}

// Run tests
runStep6Tests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});