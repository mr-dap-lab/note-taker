import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Entry Point (index.tsx)
 * 
 * JUNIOR DEV NOTE:
 * This is the very first file that runs in the React application.
 * 1. It finds the HTML element with id="root" (inside index.html).
 * 2. It takes our main <App /> component and injects it into that div.
 * 3. React.StrictMode is a dev tool that highlights potential problems (it runs effects twice in dev!).
 */

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);