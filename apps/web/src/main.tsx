import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
const App = lazy(() => import('./core/CoreGame'));
import 'leaflet/dist/leaflet.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<div className="app-loading" role="status">Memuat Railway Manager…</div>}><App /></Suspense>
  </React.StrictMode>
);
