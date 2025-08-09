import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import './i18n';
import App from './App';

// Determine manifest URL for TonConnect.  During development the app is served
// from http://localhost:5173 so we derive the manifest from that.
const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl} walletsList={[]}> {/* walletsList can be customised */}
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);