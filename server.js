require('dotenv').config({ path: '.env.local' });
console.log('REDIS URL:', process.env.UPSTASH_REDIS_REST_URL);
console.log('REDIS TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN);

const express = require('express');
const next = require('next');
const WebSocket = require('ws');
const GameManager = require('./src/game');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const gameManager = new GameManager();

app.prepare().then(() => {
  const server = express();
  server.use(express.json());

  server.post('/api/create', async (req, res) => {
    const roomCode = await gameManager.createRoom();
    res.json({ roomCode });
  });

  server.post('/api/join', async (req, res) => {
    const { roomCode, name } = req.body;
    try {
      const playerId = await gameManager.joinRoom(roomCode, name);
      res.json({ playerId });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  server.all('*', (req, res) => handle(req, res));

  const httpServer = server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });

  const wss = new WebSocket.Server({ server: httpServer });

  wss.on('connection', async (ws, req) => {
    const params = new URLSearchParams(req.url.replace('/?', ''));
    const roomCode = params.get('room');
    const playerId = params.get('player');
    const player = await gameManager.connectPlayer(roomCode, playerId, ws);
    if (!player) {
      ws.close();
      return;
    }

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        gameManager.handleMessage(roomCode, playerId, msg).catch(e => console.error(e));
      } catch (e) {
        console.error('Invalid message', e);
      }
    });

    ws.on('close', () => {
      gameManager.disconnectPlayer(roomCode, playerId).catch(e => console.error(e));
    });
  });
});
