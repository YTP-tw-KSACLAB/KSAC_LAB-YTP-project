import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './pages/Layout';
import Home from './pages/Home';
import Messages from './pages/Messages';
import './App.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<Home />} />
            <Route path="search" element={<div className="status-panel"><h2>Search Page</h2><p>Search dedicated page</p></div>} />
            <Route path="explore" element={<div className="status-panel"><h2>Explore Page</h2><p>Explore dedicated page</p></div>} />
            <Route path="reels" element={<div className="status-panel"><h2>Reels Page</h2><p>Reels dedicated page</p></div>} />
            <Route path="messages" element={<Messages />} />
            <Route path="notifications" element={<div className="status-panel"><h2>Notifications Page</h2><p>Notifications dedicated page</p></div>} />
            <Route path="profile" element={<div className="status-panel"><h2>Profile Page</h2><p>Profile dedicated page</p></div>} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
