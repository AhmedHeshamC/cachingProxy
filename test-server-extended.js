const express = require('express');
const NodeCache = require('node-cache');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');

const app = express();
// Initialize cache with checkperiod to handle TTL properly
const cache = new NodeCache({ checkperiod: 0.5 }); // Check every 0.5 seconds for expired items

// Add security middlewares
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Parse JSON bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Setup route for all proxy endpoints
app.all('/proxy', async (req, res) => {
  const url = req.query.url;
  const method = req.query.method || req.method;
  const ttl = req.query.ttl ? parseInt(req.query.ttl) : 3600; // Default 1 hour in seconds
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    // Validate URL
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  
  // Handle cache invalidation or bypassing
  const cacheControl = req.headers['cache-control'];
  const cacheKey = url + (method !== 'GET' ? `-${method}` : '');
  let cachedResponse = cache.get(cacheKey);
  
  // If cache-control: no-cache, bypass cache for reading but update it
  if (cacheControl === 'no-cache') {
    cachedResponse = null;
    res.set('X-Cache', 'BYPASS');
  } 
  // If cache-control: no-store, don't read or update cache
  else if (cacheControl === 'no-store') {
    cachedResponse = null;
    res.set('X-Cache', 'NOCACHE');
  }
  // Manual cache invalidation header
  else if (req.headers['x-cache-invalidate'] === 'true') {
    cache.del(cacheKey);
    cachedResponse = null;
    res.set('X-Cache', 'INVALIDATED');
  }
  // Otherwise use cache if available
  else if (cachedResponse) {
    res.set('X-Cache', 'HIT');
    // Set all the cached headers
    Object.entries(cachedResponse.headers || {}).forEach(([key, value]) => {
      res.set(key, value);
    });
    return res.status(cachedResponse.status).send(cachedResponse.data);
  } else {
    res.set('X-Cache', 'MISS');
  }
  
  try {
    // Forward headers except those that need special handling
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];
    
    const response = await axios({
      method: method,
      url: url,
      headers: headers,
      data: req.body,
      responseType: 'arraybuffer', // Handle any content type including binary
      timeout: 5000,
      validateStatus: status => status < 500 // Only cache responses with status < 500
    });
    
    // Parse the response based on content type
    let responseData;
    const contentType = response.headers['content-type'] || '';
    
    if (contentType.includes('application/json')) {
      responseData = JSON.parse(response.data.toString('utf8'));
    } else {
      responseData = response.data;
    }
    
    const responseObj = {
      status: response.status,
      headers: response.headers,
      data: responseData
    };
    
    // Only cache successful responses
    if (response.status < 400 && cacheControl !== 'no-store') {
      // Store with TTL in seconds
      cache.set(cacheKey, responseObj, ttl);
    }
    
    // Forward all headers from the original response
    Object.entries(response.headers).forEach(([key, value]) => {
      res.set(key, value);
    });
    
    res.status(response.status).send(responseData);
  } catch (error) {
    console.error(`Proxy error: ${error.message}`);
    const status = error.response?.status || 500;
    const message = status === 500 ? 'Internal Server Error' : error.message;
    res.status(status).json({ error: message });
  }
});

// For testing purposes
module.exports = app;
