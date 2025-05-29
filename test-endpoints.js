#!/usr/bin/env node

const http = require('http');

const baseUrl = 'http://localhost:5000';

// Test configuration
const tests = [
  // GET endpoints (should work)
  { method: 'GET', path: '/api/health', name: 'Health Check' },
  { method: 'GET', path: '/api/cvj-stages', name: 'CVJ Stages List' },
  { method: 'GET', path: '/api/analytics/weeks', name: 'Weeks List' },
  { method: 'GET', path: '/api/monthly-targets', name: 'Monthly Targets List' },
  
  // POST endpoints (should work based on our experience)
  { method: 'POST', path: '/api/auth/login', name: 'Login', data: '{"email":"test","password":"test"}' },
  
  // DELETE endpoints (likely problematic)
  { method: 'DELETE', path: '/api/analytics/weeks/test-id', name: 'Delete Week' },
  { method: 'DELETE', path: '/api/kpis/test-id', name: 'Delete KPI' },
  { method: 'DELETE', path: '/api/monthly-targets/test-id', name: 'Delete Monthly Target' },
  
  // PUT endpoints (likely problematic)
  { method: 'PUT', path: '/api/analytics/weeks/test-id', name: 'Update Week', data: '{"startDate":"2024-01-01"}' },
  { method: 'PUT', path: '/api/kpis/test-id', name: 'Update KPI', data: '{"name":"Test KPI"}' },
  { method: 'PUT', path: '/api/monthly-targets/test-id', name: 'Update Monthly Target', data: '{"targetValue":100}' },
  
  // PATCH endpoints (likely problematic)
  { method: 'PATCH', path: '/api/analytics/weeks/test-id', name: 'Patch Week', data: '{"startDate":"2024-01-01"}' },
  { method: 'PATCH', path: '/api/kpis/test-id', name: 'Patch KPI', data: '{"name":"Test KPI"}' },
];

function makeRequest(method, path, data = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      const duration = Date.now() - startTime;
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          duration: duration,
          data: responseData,
          method: method,
          path: path
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 'ERROR',
        duration: Date.now() - startTime,
        data: err.message,
        method: method,
        path: path
      });
    });

    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🔍 Testing API Endpoints for Routing Conflicts\n');
  console.log('='.repeat(80));
  
  for (const test of tests) {
    try {
      const result = await makeRequest(test.method, test.path, test.data);
      
      const status = result.statusCode;
      const duration = result.duration;
      const isProblematic = duration < 10 && status === 200; // Quick responses are usually caught by middleware
      
      console.log(`${test.method.padEnd(6)} ${test.path.padEnd(35)} | ${String(status).padEnd(3)} | ${String(duration).padEnd(4)}ms | ${test.name}`);
      
      if (isProblematic) {
        console.log(`       ⚠️  POTENTIAL ROUTING CONFLICT (too fast response)`);
      }
      
    } catch (error) {
      console.log(`${test.method.padEnd(6)} ${test.path.padEnd(35)} | ERR | ????ms | ${test.name} - ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('='.repeat(80));
  console.log('✅ Test completed. Check for endpoints with < 10ms response times.');
}

runTests().catch(console.error);