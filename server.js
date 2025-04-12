const express = require('express');
const NodeCache = require('node-cache');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { URL } = require('url');

const app = express();
const cache = new NodeCache();

// Add security middlewares
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

let originUrl = '';

const startServer = (port, origin) => {
  // Validate origin URL
  try {
    new URL(origin);
    originUrl = origin;
  } catch (e) {
    console.error('Invalid origin URL provided');
    process.exit(1);
  }
  
  app.use(async (req, res) => {
    const cacheKey = req.originalUrl;
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
      res.set('X-Cache', 'HIT');
      return res.status(cachedResponse.status).set(cachedResponse.headers).send(cachedResponse.data);
    }

    try {
      // Sanitize headers
      const sanitizedHeaders = {...req.headers};
      delete sanitizedHeaders.host;
      delete sanitizedHeaders.connection;
      
      const response = await axios({
        method: req.method,
        url: `${originUrl}${req.originalUrl}`,
        data: req.body,
        headers: sanitizedHeaders,
        timeout: 5000, // 5 second timeout
        validateStatus: status => status < 500 // Only cache responses with status < 500
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
      res.status(response.status).set(response.headers).send(response.data);
    } catch (error) {
      console.error(`Proxy error: ${error.message}`);
      const status = error.response?.status || 500;
      const message = status === 500 ? 'Internal Server Error' : error.message;
      res.status(status).json({ error: message });
    }
  });

  app.listen(port, '127.0.0.1', () => { // Only listen on localhost
    console.log(`Proxy server running on port ${port}`);
    console.log(`Forwarding requests to ${originUrl}`);
  });
};

const clearCache = () => {
  cache.flushAll();
  console.log('Cache cleared successfully');
};

module.exports = { startServer, clearCache };
