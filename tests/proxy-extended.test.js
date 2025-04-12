const request = require('supertest');
const { expect } = require('chai');
const nock = require('nock');
const app = require('../test-server-extended');

describe('Extended Proxy Tests', () => {
  const testApiUrl = 'https://api.example.com';
  
  beforeEach(() => {
    nock.cleanAll();
  });

  after(() => {
    nock.restore();
  });

  it('should handle POST requests properly', async () => {
    const path = '/users';
    const requestBody = { name: 'Test User' };
    const responseBody = { id: 1, name: 'Test User' };
    
    const mockApi = nock(testApiUrl)
      .post(path, requestBody)
      .reply(201, responseBody);

    const response = await request(app)
      .post('/proxy')
      .query({ url: `${testApiUrl}${path}`, method: 'POST' })
      .send(requestBody);
    
    expect(response.status).to.equal(201);
    expect(response.body).to.deep.equal(responseBody);
    expect(mockApi.isDone()).to.be.true;
  });

  it('should respect cache-control: no-cache header', async () => {
    const path = '/data';
    const responseBody1 = { data: 'first response' };
    const responseBody2 = { data: 'second response' };
    
    // First request
    nock(testApiUrl)
      .get(path)
      .reply(200, responseBody1);
      
    const response1 = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` });
      
    expect(response1.status).to.equal(200);
    expect(response1.body).to.deep.equal(responseBody1);
    expect(response1.headers['x-cache']).to.equal('MISS');
    
    // Second request with no-cache
    nock(testApiUrl)
      .get(path)
      .reply(200, responseBody2);
    
    const response2 = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` })
      .set('Cache-Control', 'no-cache');
    
    expect(response2.status).to.equal(200);
    expect(response2.body).to.deep.equal(responseBody2);
    expect(response2.headers['x-cache']).to.equal('BYPASS');
    
    // Third request (should get updated cache)
    const response3 = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` });
    
    expect(response3.status).to.equal(200);
    expect(response3.body).to.deep.equal(responseBody2);
    expect(response3.headers['x-cache']).to.equal('HIT');
  });

  it('should handle rate limiting from upstream server', async () => {
    const path = '/rate-limited';
    
    nock(testApiUrl)
      .get(path)
      .reply(429, { error: 'Too Many Requests' }, {
        'Retry-After': '60'
      });
    
    const response = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` });
    
    expect(response.status).to.equal(429);
    expect(response.body).to.have.property('error');
    expect(response.headers).to.have.property('retry-after');
  });

  it('should be able to cache binary data', async () => {
    const path = '/binary-data';
    const binaryData = Buffer.from('binary data simulation', 'utf-8');
    
    nock(testApiUrl)
      .get(path)
      .reply(200, binaryData, {
        'content-type': 'application/octet-stream'
      });
    
    // First request
    const response1 = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` });
    
    expect(response1.status).to.equal(200);
    expect(response1.headers['content-type']).to.equal('application/octet-stream');
    
    // Second request should be from cache
    const response2 = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` });
    
    expect(response2.status).to.equal(200);
    expect(response2.headers['x-cache']).to.equal('HIT');
    expect(response2.headers['content-type']).to.equal('application/octet-stream');
  });

  it('should respect cache expiration time', async () => {
    const path = '/expiring-data';
    const responseBody = { data: 'expiring data' };
    const responseBody2 = { data: 'updated data' };
    
    // First call
    nock(testApiUrl)
      .get(path)
      .reply(200, responseBody);
      
    // Setup second call for after expiration
    nock(testApiUrl)
      .get(path)
      .reply(200, responseBody2);
    
    // First request with short TTL
    const response1 = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}`, ttl: 1 }); // 1 second TTL
    
    expect(response1.status).to.equal(200);
    expect(response1.headers['x-cache']).to.equal('MISS');
    
    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
    
    // Second request after expiration
    const response2 = await request(app)
      .get('/proxy')
      .query({ url: `${testApiUrl}${path}` });
    
    expect(response2.headers['x-cache']).to.equal('MISS');
    expect(response2.body).to.deep.equal(responseBody2);
  });
});
