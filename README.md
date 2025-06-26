# Slights: A Game of Minor Inconveniences

This is a small multiplayer card game built with Next.js and a custom Express
server. Rooms are stored in Redis (Upstash) and players connect via WebSockets
for real-time play.

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Create a `.env.local` file with your Upstash credentials (see `.env.example`):

```
UPSTASH_REDIS_REST_URL=your-url
UPSTASH_REDIS_REST_TOKEN=your-token
```

The Redis client at `src/redisClient.js` reads these variables via
`Redis.fromEnv()`:

```js
const redis = require('./src/redisClient');
```

