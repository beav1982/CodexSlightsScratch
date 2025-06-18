const { v4: uuidv4 } = require('uuid');
const cards = require('../cards');
const redis = require('./redisClient');

class Room {
  constructor(code) {
    this.code = code;
    this.players = [];
    this.judgeIndex = 0;
    this.deckSlight = [...cards.slightCards];
    this.deckCurse = [...cards.curseCards];
    this.hands = {}; // playerId => [cards]
    this.submissions = {};
    this.currentSlight = null;
  }

  toJSON() {
    return {
      code: this.code,
      players: this.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
      judgeIndex: this.judgeIndex,
      deckSlight: this.deckSlight,
      deckCurse: this.deckCurse,
      hands: this.hands,
      submissions: this.submissions,
      currentSlight: this.currentSlight
    };
  }

  static fromJSON(data) {
    const room = new Room(data.code);
    room.players = data.players.map(p => ({ ...p, ws: null }));
    room.judgeIndex = data.judgeIndex;
    room.deckSlight = data.deckSlight;
    room.deckCurse = data.deckCurse;
    room.hands = data.hands;
    room.submissions = data.submissions;
    room.currentSlight = data.currentSlight;
    return room;
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    this.players.forEach(p => {
      if (p.ws && p.ws.readyState === 1) {
        p.ws.send(data);
      }
    });
  }
}

class GameManager {
  constructor() {
    this.rooms = new Map();
  }

  async saveRoom(room) {
    try {
      await redis.set(`room:${room.code}`, JSON.stringify(room.toJSON()));
    } catch (err) {
      console.error('Redis save error', err);
    }
  }

  async loadRoom(code) {
    if (this.rooms.has(code)) return this.rooms.get(code);
    try {
      const data = await redis.get(`room:${code}`);
      if (data) {
        const room = Room.fromJSON(typeof data === 'string' ? JSON.parse(data) : data);
        this.rooms.set(code, room);
        return room;
      }
    } catch (err) {
      console.error('Redis load error', err);
    }
    return null;
  }

  async createRoom() {
    const code = Math.random().toString(36).substr(2, 4).toUpperCase();
    const room = new Room(code);
    this.rooms.set(code, room);
    await this.saveRoom(room);
    return code;
  }

  async joinRoom(code, name) {
    let room = await this.loadRoom(code);
    if (!room) throw new Error('Room not found');
    const playerId = uuidv4();
    room.players.push({ id: playerId, name, score: 0, ws: null });
    room.hands[playerId] = this.drawCards(room, 7);
    await this.saveRoom(room);
    return playerId;
  }

  async connectPlayer(code, playerId, ws) {
    const room = await this.loadRoom(code);
    if (!room) return null;
    const player = room.players.find(p => p.id === playerId);
    if (!player) return null;
    player.ws = ws;
    ws.send(JSON.stringify({ type: 'init', playerId, players: room.players, hand: room.hands[playerId], judgeId: room.players[room.judgeIndex].id }));
    room.broadcast({ type: 'player_list', players: room.players });
    return player;
  }

  async disconnectPlayer(code, playerId) {
    const room = await this.loadRoom(code);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.ws = null;
      await this.saveRoom(room);
    }
  }

  async handleMessage(code, playerId, msg) {
    const room = await this.loadRoom(code);
    if (!room) return;
    switch (msg.type) {
      case 'start':
        await this.startRound(room);
        break;
      case 'play_card':
        await this.handlePlay(room, playerId, msg.card);
        break;
      case 'pick_winner':
        await this.finishRound(room, msg.playerId);
        break;
    }
  }

  drawCards(room, count) {
    const cards = [];
    for (let i = 0; i < count; i++) {
      if (room.deckCurse.length === 0) room.deckCurse = [...require('../cards').curseCards];
      cards.push(room.deckCurse.pop());
    }
    return cards;
  }

  async startRound(room) {
    room.submissions = {};
    if (room.deckSlight.length === 0) room.deckSlight = [...require('../cards').slightCards];
    room.currentSlight = room.deckSlight.pop();
    const judge = room.players[room.judgeIndex];
    room.broadcast({ type: 'round_start', slight: room.currentSlight, judgeId: judge.id });
    room.players.forEach(p => {
      if (p.id !== judge.id) {
        p.ws && p.ws.send(JSON.stringify({ type: 'hand', hand: room.hands[p.id] }));
      }
    });
    await this.saveRoom(room);
  }

  async handlePlay(room, playerId, card) {
    if (room.submissions[playerId]) return; // already played
    room.submissions[playerId] = card;
    // remove from hand and draw new
    const hand = room.hands[playerId];
    const idx = hand.indexOf(card);
    if (idx !== -1) hand.splice(idx, 1);
    hand.push(...this.drawCards(room, 1));

    // check if all plays in
    const judge = room.players[room.judgeIndex];
    const required = room.players.filter(p => p.id !== judge.id).length;
    if (Object.keys(room.submissions).length === required) {
      const submissions = Object.entries(room.submissions).map(([pid, card]) => ({ playerId: pid, card }));
      judge.ws && judge.ws.send(JSON.stringify({ type: 'choose_winner', submissions }));
    }
    await this.saveRoom(room);
  }

  async finishRound(room, winnerId) {
    const winner = room.players.find(p => p.id === winnerId);
    if (winner) winner.score += 1;
    room.broadcast({ type: 'round_end', winnerId, card: room.submissions[winnerId], scores: room.players });
    room.judgeIndex = (room.judgeIndex + 1) % room.players.length;
    await this.saveRoom(room);
    setTimeout(() => this.startRound(room), 2000);
  }
}

module.exports = GameManager;
