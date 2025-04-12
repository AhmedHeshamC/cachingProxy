# Testing the Caching Proxy

This document explains how to run and understand the test suite for the caching proxy.

## Test Files

The project includes three test files:

1. `proxy.test.js` - Basic tests for the proxy functionality
2. `proxy-advanced.test.js` - Advanced tests (these work with the extended server)
3. `proxy-extended.test.js` - Tests for the extended proxy server with full functionality

## Running Tests

You can run the tests using the following npm scripts:

```bash
# Run all tests
npm test

# Run basic tests only
npm run test:basic

# Run advanced tests
npm run test:advanced

# Run extended tests
npm run test:extended
```

## Test Server Implementation

There are two server implementations used for testing:

1. `test-server.js` - Basic implementation used by the basic tests
2. `test-server-extended.js` - Extended implementation with additional features:
   - Support for various HTTP methods (GET, POST, PUT, DELETE)
   - Support for Cache-Control headers
   - Support for custom cache TTLs
   - Binary data handling
   - Comprehensive header management

## Test Coverage

The tests cover the following scenarios:

- Basic HTTP GET requests
- POST requests with request body
- Cache hits and misses
- Cache control with headers
- Binary data handling
- Cache expiration with TTLs
- Error handling
- Status code propagation
- Header propagation

## Troubleshooting

If the cache expiration test is failing:
- Make sure the NodeCache is configured with `checkperiod` option
- Ensure the TTL value is properly passed to the cache
- Make sure the delay between requests is longer than the TTL
- Verify that different response bodies are used to confirm cache miss
