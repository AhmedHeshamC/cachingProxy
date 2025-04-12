# Caching Proxy BY Ahmed Hesham

A lightweight HTTP caching proxy server built with Node.js that caches responses to improve performance and reduce external API calls.

## Features

- Caches API responses based on request URL
- Configurable cache expiration time
- Support for various HTTP methods
- Transparent proxying of requests
- Cache invalidation options

## Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd cachingProxy

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the project root with the following variables:

```
PORT=3000
TARGET_URL=https://api.example.com
CACHE_EXPIRATION=3600000  # milliseconds (1 hour)
```

## Usage

### Starting the proxy server

```bash
npm start
```

### Making requests

Send your requests to the proxy server instead of directly to the target API:

```
# Original request
GET https://api.example.com/data

# Proxied request
GET http://localhost:3000/data
```

All path segments, query parameters, headers, and request body will be forwarded to the target API.

### Cache Control

You can control caching behavior using HTTP headers:

- `Cache-Control: no-cache` - Skip the cache for this request but update cache with new response
- `Cache-Control: no-store` - Skip the cache completely (don't read or update cache)
- `X-Cache-Invalidate: true` - Force invalidate the cache for this URL

### Checking Cache Status

The proxy adds headers to responses to indicate cache status:

- `X-Cache-Status: HIT` - Response was served from cache
- `X-Cache-Status: MISS` - Response was fetched from target and cached
- `X-Cache-Status: BYPASS` - Caching was bypassed for this request

## Advanced Usage

### Custom Cache Keys

By default, the cache key is the full request URL. For more complex caching strategies, modify the `getCacheKey` function in the code.

### Cache Storage Options

The default implementation uses an in-memory cache. For production use, consider implementing a persistent cache using Redis or another storage solution.

### Performance Monitoring

Monitor cache hit rates and response times with the added response headers:

- `X-Response-Time` - Time taken to process the request
- `X-Cache-Timestamp` - When the cached response was stored

## License

MIT

## Author
Ahmed Hesham

## Project URLs
- https://roadmap.sh/projects/caching-server
- https://github.com/AhmedHeshamC/cachingProxy