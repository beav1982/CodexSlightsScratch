import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Room() {
  const router = useRouter();
  const { code } = router.query;
  const playerId = router.query.player;
  const [ws, setWs] = useState(null);
  const [players, setPlayers] = useState([]);
  const [hand, setHand] = useState([]);
  const [slight, setSlight] = useState('');
  const [judgeId, setJudgeId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [scores, setScores] = useState([]);

  useEffect(() => {
    if (!code || !playerId) return;
    const socket = new WebSocket(`ws://${window.location.host}/?room=${code}&player=${playerId}`);
    socket.onopen = () => setWs(socket);
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'init':
          setPlayers(msg.players);
          setHand(msg.hand);
          setJudgeId(msg.judgeId);
          break;
        case 'player_list':
          setPlayers(msg.players);
          break;
        case 'round_start':
          setSlight(msg.slight);
          setJudgeId(msg.judgeId);
          setSubmissions([]);
          break;
        case 'hand':
          setHand(msg.hand);
          break;
        case 'choose_winner':
          setSubmissions(msg.submissions);
          break;
        case 'round_end':
          setScores(msg.scores);
          break;
      }
    };
    return () => socket.close();
  }, [code, playerId]);

  const playCard = (card) => {
    if (ws) ws.send(JSON.stringify({ type: 'play_card', card }));
  };

  const pickWinner = (playerId) => {
    if (ws) ws.send(JSON.stringify({ type: 'pick_winner', playerId }));
  };

  const startGame = () => {
    if (ws) ws.send(JSON.stringify({ type: 'start' }));
  };

  const isJudge = judgeId === playerId;

  return (
    <div style={{ padding: 20 }}>
      <h2>Room: {code}</h2>
      <div>
        Players: {players.map(p => p.name).join(', ')}
      </div>
      <div>
        Judge: {players.find(p => p.id === judgeId)?.name}
      </div>
      {slight && <h3>Slight: {slight}</h3>}

      {!slight && isJudge && <button onClick={startGame}>Start Game</button>}

      {!isJudge && hand.length > 0 && (
        <div>
          <h4>Your Hand</h4>
          {hand.map(card => (
            <button key={card} onClick={() => playCard(card)} style={{ margin: 5 }}>
              {card}
            </button>
          ))}
        </div>
      )}

      {isJudge && submissions.length > 0 && (
        <div>
          <h4>Pick a Winner</h4>
          {submissions.map(s => (
            <button key={s.playerId} onClick={() => pickWinner(s.playerId)} style={{ margin:5 }}>
              {s.card}
            </button>
          ))}
        </div>
      )}

      {scores.length > 0 && (
        <div>
          <h4>Scores</h4>
          <ul>
            {scores.map(p => (
              <li key={p.id}>{p.name}: {p.score}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
