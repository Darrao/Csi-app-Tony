import React from 'react';
import ReactDOM from 'react-dom/client'; // Utilisation de la nouvelle API
import App from './App';
import './index.css'; // Si tu as un fichier CSS global

// Crée un point d'entrée pour React
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

// Rends ton application
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);