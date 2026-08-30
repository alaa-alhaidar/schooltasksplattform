import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Router } from './router';
import './index.css';

document.documentElement.classList.toggle(
  'dark',
  window.localStorage.getItem('schooltasks:theme') === 'dark'
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}
