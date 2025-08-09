// Страница матча.  Подключается к Socket.IO для получения ходов и других
// событий по конкретному матчу, отображает историю сообщений и позволяет
// отправлять свои ходы через REST API.  Простая реализация для демонстрации.
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import api from '../api';

interface MoveEvent {
  userId: number;
  move: any;
}

const MatchPage: React.FC = () => {
  const { matchId } = useParams();
  const [messages, setMessages] = useState<string[]>([]);
  const [moveInput, setMoveInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!matchId) return;
    const url = api.defaults.baseURL?.replace('/api', '');
    const s = io(url!, { transports: ['websocket'] });
    s.on('connect', () => {
      s.emit('join', Number(matchId));
    });
    s.on('move', (payload: MoveEvent) => {
      setMessages((prev) => [...prev, `User ${payload.userId} played ${JSON.stringify(payload.move)}`]);
    });
    s.on('commit', ({ userId }) => {
      setMessages((prev) => [...prev, `User ${userId} committed move`]);
    });
    s.on('reveal', ({ userId, move }) => {
      setMessages((prev) => [...prev, `User ${userId} revealed ${move}`]);
    });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [matchId]);

  const sendMove = async () => {
    if (!matchId || !moveInput) return;
    try {
      const move = { text: moveInput };
      await api.post(`/matches/${matchId}/move`, { move });
      setMoveInput('');
    } catch (err) {
      console.error(err);
      alert('Failed to send move');
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Match #{matchId}</h1>
      <div style={{ border: '1px solid #ccc', padding: 8, height: 200, overflowY: 'scroll' }}>
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <input
          type="text"
          value={moveInput}
          onChange={(e) => setMoveInput(e.target.value)}
          placeholder="Enter your move"
        />
        <button onClick={sendMove} style={{ marginLeft: 4 }}>
          Send
        </button>
      </div>
    </div>
  );
};

export default MatchPage;