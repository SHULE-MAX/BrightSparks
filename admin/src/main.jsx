import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { startPwa } from './lib/pwa.js';
import './index.css';

// Before rendering: the browser's install offer can arrive earlier than React.
startPwa();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
