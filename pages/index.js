import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const router = useRouter();

  const createRoom = async () => {
    const res = await fetch('/api/create', { method: 'POST' });
    const data = await res.json();
    const joinRes = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: data.roomCode, name })
    });
    const joinData = await joinRes.json();
    router.push(`/room/${data.roomCode}?player=${joinData.playerId}`);
  };

  const joinRoom = async () => {
    const joinRes = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: joinCode.toUpperCase(), name })
    });
    const joinData = await joinRes.json();
    router.push(`/room/${joinCode.toUpperCase()}?player=${joinData.playerId}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Slights: A Game of Minor Inconveniences</h1>
      <input placeholder="Display name" value={name} onChange={e => setName(e.target.value)} />
      <div style={{ marginTop: 10 }}>
        <button onClick={createRoom}>Create Room</button>
      </div>
      <div style={{ marginTop: 10 }}>
        <input placeholder="Room Code" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
        <button onClick={joinRoom}>Join Room</button>
      </div>
    </div>
  );
}
