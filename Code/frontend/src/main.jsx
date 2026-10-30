import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { apiClient } from './api/apiClient.js';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App api={apiClient} />
  </React.StrictMode>,
);
