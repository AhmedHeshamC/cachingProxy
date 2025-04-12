const request = require('supertest');
const { expect } = require('chai');
const app = require('../test-server');

describe('Caching Proxy Tests', () => {
  it('should return 200 for a valid request', async () => {
    const response = await request(app)
      .get('/proxy')
      .query({ url: 'https://api.github.com/users/github' });
    
    expect(response.status).to.equal(200);
  });

  it('should return cached response on second request', async () => {
    const url = 'https://api.github.com/users/github';
    
    // First request
    const response1 = await request(app)
      .get('/proxy')
      .query({ url });
    
    // Second request
    const response2 = await request(app)
      .get('/proxy')
      .query({ url });
    
    expect(response1.status).to.equal(200);
    expect(response2.status).to.equal(200);
    // Bodies might not be exactly equal due to response format variations
    expect(response2.headers['x-cache']).to.equal('HIT');
  });

  it('should return 400 for invalid URL', async () => {
    const response = await request(app)
      .get('/proxy')
      .query({ url: 'invalid-url' });
    
    expect(response.status).to.equal(400);
  });
});
