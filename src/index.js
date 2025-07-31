import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import AppWithRealAuth from "./AppWithRealAuth";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppWithRealAuth />
  </React.StrictMode>
);