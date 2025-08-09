// Основной компонент приложения.  Инициализирует аутентификацию
// пользователя через `initData`, сохраняет JWT, переключает язык и
// предоставляет контекст Auth для дочерних компонентов.  Настраивает
// маршруты для лобби, комнаты и матча.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import api from './api';
import LobbyPage from './pages/LobbyPage';
import RoomPage from './pages/RoomPage';
import MatchPage from './pages/MatchPage';
import { useTranslation } from 'react-i18next';

interface AuthState {
  userId: number | null;
  lang: string;
  tgUser: any;
  loaded: boolean;
}

const AuthContext = createContext<AuthState>({ userId: null, lang: 'en', tgUser: null, loaded: false });

export const useAuth = () => useContext(AuthContext);

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ userId: null, lang: 'en', tgUser: null, loaded: false });
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Parse initData from URL
    const params = new URLSearchParams(window.location.search);
    const rawInitData = params.get('initData');
    async function init() {
      try {
        if (rawInitData) {
          const res = await api.post('/auth/validate-init', { initData: rawInitData });
          const { userId, lang, tgUser, jwt } = res.data;
          localStorage.setItem('jwt', jwt);
          setAuth({ userId, lang, tgUser, loaded: true });
          // Switch language
          i18n.changeLanguage(lang);
        } else {
          // If not launched from Telegram, mark loaded but no auth
          setAuth({ userId: null, lang: 'en', tgUser: null, loaded: true });
        }
      } catch (err) {
        console.error(err);
        setAuth({ userId: null, lang: 'en', tgUser: null, loaded: true });
      }
    }
    init();
  }, [i18n]);

  if (!auth.loaded) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="/match/:matchId" element={<MatchPage />} />
      </Routes>
    </AuthContext.Provider>
  );
};

// Wrap App with BrowserRouter so that navigate can be used inside
const AppWithRouter: React.FC = () => (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

export default AppWithRouter;