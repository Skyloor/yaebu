// Страница лобби.  Загружает список комнат, позволяет присоединиться к
// существующей комнате или создать новую.  Использует i18n для локализации.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { GameType } from '@shared';

interface RoomSummary {
  id: number;
  game: GameType;
  stake_ton: number;
  privacy: string;
  status: string;
}

const STAKE_PRESETS = [1, 2, 5, 10, 50];

const LobbyPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [createForm, setCreateForm] = useState({
    game: 'rps' as GameType,
    stake: 1,
    privacy: 'public',
  });

  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await api.get('/rooms');
        setRooms(res.data.rooms);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/rooms', {
        game: createForm.game,
        rules: {},
        timeFormat: '',
        stake: createForm.stake,
        privacy: createForm.privacy,
      });
      const id = res.data.id;
      navigate(`/room/${id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create room');
    }
  };

  const handleJoin = async (id: number) => {
    try {
      await api.post(`/rooms/${id}/join`);
      navigate(`/room/${id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to join room');
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>{t('home.title')}</h1>
      {loading ? (
        <p>Loading...</p>
      ) : rooms.length === 0 ? (
        <p>{t('home.noRooms')}</p>
      ) : (
        <table style={{ width: '100%', marginBottom: '1rem' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('home.game')}</th>
              <th>{t('home.stake')}</th>
              <th>{t('home.privacy')}</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td>{room.id}</td>
                <td>{room.game}</td>
                <td>{room.stake_ton}</td>
                <td>{room.privacy}</td>
                <td>
                  <button onClick={() => handleJoin(room.id)} disabled={room.status !== 'WAITING'}>
                    {room.status === 'WAITING' ? 'Join' : room.status}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>{t('home.createRoom')}</h2>
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 400 }}>
        <label>
          {t('home.game')}
          <select value={createForm.game} onChange={(e) => setCreateForm({ ...createForm, game: e.target.value as GameType })}>
            <option value="rps">RPS</option>
            <option value="durak">Durak</option>
            <option value="checkers">Checkers</option>
            <option value="chess">Chess</option>
          </select>
        </label>
        <label>
          {t('home.stake')}
          <select value={createForm.stake} onChange={(e) => setCreateForm({ ...createForm, stake: Number(e.target.value) })}>
            {STAKE_PRESETS.map((p) => (
              <option key={p} value={p}>{p} TON</option>
            ))}
          </select>
        </label>
        <label>
          {t('home.privacy')}
          <select value={createForm.privacy} onChange={(e) => setCreateForm({ ...createForm, privacy: e.target.value })}>
            <option value="public">{t('home.public')}</option>
            <option value="private">{t('home.private')}</option>
          </select>
        </label>
        <button type="submit">{t('home.submit')}</button>
      </form>
    </div>
  );
};

export default LobbyPage;