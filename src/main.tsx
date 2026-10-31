import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import './styles/main.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Missing #root element in index.html');
}

// Explicit createRoot import: never rely on a global ReactDOM variable.
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
