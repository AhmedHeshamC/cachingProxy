const express = require('express');
const NodeCache = require('node-cache');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const cache = new NodeCache();

// Add security middlewares
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Setup route for proxy endpoint
app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    // Validate URL
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  
  const cacheKey = url;
  const cachedResponse = cache.get(cacheKey);
  
  if (cachedResponse) {
    res.set('X-Cache', 'HIT');
    return res.status(cachedResponse.status).set(cachedResponse.headers).send(cachedResponse.data);
  }
  
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      timeout: 5000,
      validateStatus: status => status < 500
    });
    
    const responseData = {
      status: response.status,
      headers: response.headers,
      data: response.data
    };
    
    if (response.status < 400) {
      cache.set(cacheKey, responseData);
    }
    
    res.set('X-Cache', 'MISS');
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error(`Proxy error: ${error.message}`);
    const status = error.response?.status || 500;
    const message = status === 500 ? 'Internal Server Error' : error.message;
    res.status(status).json({ error: message });
  }
});

// For testing purposes
module.exports = app;
