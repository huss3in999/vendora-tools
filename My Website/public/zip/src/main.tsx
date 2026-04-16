import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { pruneOrphanRotaStorageKeys } from './rotaBrowserStorage';

pruneOrphanRotaStorageKeys();

if (import.meta.env.VITE_E2E === '1') {
  void import('./utils').then((m) => {
    (window as unknown as { __ROTA_SCHEDULER__?: typeof m }).__ROTA_SCHEDULER__ = m;
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
