import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './services/socket';
import { Chart as ChartJS } from 'chart.js';
import Dashboard from './pages/Dashboard';
import Operations from './pages/Operations';
import Analytics from './pages/Analytics';
import Services from './pages/CitizenServices';
import MapView from './pages/DigitalTwin';
import Layout from './components/Layout';

// Global Chart.js defaults — ensure tooltips appear on hover for all charts
ChartJS.defaults.interaction.mode = 'index';
ChartJS.defaults.interaction.intersect = false;
ChartJS.defaults.plugins.tooltip.enabled = true;

const STATIC_USER = { fullName: 'App User', role: 'admin' };

function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const handleThemeToggle = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <SocketProvider>
      <Router>
        <Layout user={STATIC_USER} theme={theme} onThemeToggle={handleThemeToggle}>
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/analytics"  element={<Analytics />} />
            <Route path="/services"   element={<Services />} />
            <Route path="/map"        element={<MapView />} />
            <Route path="*"           element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </SocketProvider>
  );
}

export default App;
