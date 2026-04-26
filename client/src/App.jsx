import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { LangProvider } from './context/LangContext';
import Layout from './pages/Layout';
import Home from './pages/Home';
import Messages from './pages/Messages';
import Planner from './pages/Planner';
import Navigation from './pages/Navigation';
import Reels from './pages/Reels';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import './App.css';

function App() {
  return (
    <LangProvider>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<Home />} />
            <Route path="planner" element={<Planner />} />
            <Route path="navigation" element={<Navigation />} />
            <Route path="search" element={<Navigate to="/planner" replace />} />
            <Route path="explore" element={<Navigate to="/planner" replace />} />
            <Route path="reels" element={<Reels />} />
            <Route path="messages" element={<Messages />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
    </LangProvider>
  );
}

export default App;
