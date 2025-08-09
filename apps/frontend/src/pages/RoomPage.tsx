// Страница отдельной комнаты.  Показывает основные параметры комнаты,
// статус ожидания второго игрока, и позволяет начать матч или покинуть
// комнату.  При старте матча пока просто переходит на страницу матча.
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useTranslation } from 'react-i18next';

interface RoomDetail {
  id: number;
  game: string;
  stake_ton: number;
  privacy: string;
  status: string;
  owner_id: number;
}

const RoomPage: React.FC = () => {
  const { roomId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoom() {
      try {
        // Reuse the list API and filter by id
        const res = await api.get('/rooms');
        const found = res.data.rooms.find((r: any) => r.id === Number(roomId));
        setRoom(found || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchRoom();
  }, [roomId]);

  const handleStart = () => {
    // For now navigate to match route using room id as match id stub
    navigate(`/match/${roomId}`);
  };

  const handleLeave = async () => {
    try {
      await api.post(`/rooms/${roomId}/leave`);
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Failed to leave room');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!room) return <p>Room not found</p>;

  return (
    <div style={{ padding: 16 }}>
      <h1>
        {t('room.title')} #{room.id}
      </h1>
      <p>
        Game: {room.game} | Stake: {room.stake_ton} TON | Privacy: {room.privacy}
      </p>
      <p>{room.status === 'WAITING' ? t('room.waiting') : t('room.title')}</p>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={handleStart}>{t('room.start')}</button>
        <button onClick={handleLeave} style={{ marginLeft: '0.5rem' }}>
          {t('room.leave')}
        </button>
      </div>
    </div>
  );
};

export default RoomPage;