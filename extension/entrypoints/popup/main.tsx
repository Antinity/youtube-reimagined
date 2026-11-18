import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.tsx';
import { ConfirmProvider } from './Confirm';
import './popup.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfirmProvider><App /></ConfirmProvider>
  </React.StrictMode>,
);
