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

To build for production and run the server:

```bash
npm run build
npm start
```

Create a `.env.local` file with your Upstash credentials (see `.env.example`):

```
UPSTASH_REDIS_URL=your-url
UPSTASH_REDIS_TOKEN=your-token
```
**Do not commit this file; it is ignored by `.gitignore`.**


The server runs at `http://localhost:3000`.

