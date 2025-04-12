const request = require('supertest');
const { expect } = require('chai');
const nock = require('nock');
const app = require('../test-server');
const sinon = require('sinon');
const NodeCache = require('node-cache');

describe('Advanced Caching Proxy Tests', () => {
  const testApiUrl = 'https://api.example.com';
  
  beforeEach(() => {
    // Clear all nock interceptors
    nock.cleanAll();
  });

  after(() => {
    // Clean up nocks
    nock.restore();
  });

  it('should handle GET requests properly', async () => {
    const path = '/users';
    const responseBody = { id: 1, name: 'Test User' };
    
    // Mock the external API
    const mockApi = nock(testApiUrl)
      .get(path)
      .reply(200, responseBody);

    const response = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` });
    
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal(responseBody);
    expect(mockApi.isDone()).to.be.true;
  });

  it('should cache responses and return HIT on second request', async () => {
    const path = '/data';
    const responseBody = { data: 'test response' };
    
    // Mock the external API - should only be called once
    nock(testApiUrl)
      .get(path)
      .reply(200, responseBody);
      
    // First request (this should be cached)
    const response1 = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` });
      
    expect(response1.status).to.equal(200);
    expect(response1.body).to.deep.equal(responseBody);
    expect(response1.headers['x-cache']).to.equal('MISS');
    
    // Second request should be from cache
    const response2 = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` });
    
    expect(response2.status).to.equal(200);
    expect(response2.body).to.deep.equal(responseBody);
    expect(response2.headers['x-cache']).to.equal('HIT');
  });

  it('should handle network errors gracefully', async () => {
    const path = '/error-endpoint';
    
    // Mock a network error
    nock(testApiUrl)
      .get(path)
      .replyWithError('Network error simulation');
    
    const response = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` });
    
    expect(response.status).to.equal(500);
    expect(response.body).to.have.property('error');
  });

  it('should handle different status codes appropriately', async () => {
    const path = '/not-found';
    
    // Mock a 404 response
    nock(testApiUrl)
      .get(path)
      .reply(404, { error: 'Resource not found' });
    
    const response = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` });
    
    expect(response.status).to.equal(404);
    expect(response.body).to.have.property('error');
  });

  it('should handle redirects properly', async () => {
    const originalPath = '/redirect';
    const redirectPath = '/target';
    const responseBody = { success: true };
    
    // Set up the redirect
    nock(testApiUrl)
      .get(originalPath)
      .reply(302, '', { 'Location': `${testApiUrl}${redirectPath}` });
    
    // Set up the target endpoint
    nock(testApiUrl)
      .get(redirectPath)
      .reply(200, responseBody);
    
    // Axios should follow redirects by default
    const response = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${originalPath}` });
    
    expect(response.status).to.equal(200);
    expect(response.body).to.deep.equal(responseBody);
  });

  it('should not cache error responses', async () => {
    const path = '/error-no-cache';
    
    // First request - simulate server error
    nock(testApiUrl)
      .get(path)
      .reply(500, { error: 'Internal Server Error' });
    
    const response1 = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` });
    
    expect(response1.status).to.equal(500);
    
    // Second request - simulate success
    nock(testApiUrl)
      .get(path)
      .reply(200, { data: 'success data' });
    
    const response2 = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` });
    
    // Should not return cached error
    expect(response2.status).to.equal(200);
    expect(response2.body).to.deep.equal({ data: 'success data' });
  });
});
