import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MyBookings from './pages/MyBookings';

function Nav() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return null;

  return (
    <nav className="bg-[#0D0E12] border-b border-[#262830] shadow-2xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F5D061] to-[#B89344] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
              <svg className="w-5 h-5 text-black font-black" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#E5C378] tracking-widest uppercase">
              FitSlot
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <Link 
              to="/" 
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                location.pathname === '/' 
                  ? 'bg-[#1C1E26] text-[#F5D061] border border-[#D4AF37]/40 shadow-inner' 
                  : 'text-[#A0A5B5] hover:bg-[#1C1E26] hover:text-[#F5D061]'
              }`}
            >
              Gym Slots
            </Link>
            <Link 
              to="/my-bookings" 
              className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                location.pathname === '/my-bookings' 
                  ? 'bg-[#1C1E26] text-[#F5D061] border border-[#D4AF37]/40 shadow-inner' 
                  : 'text-[#A0A5B5] hover:bg-[#1C1E26] hover:text-[#F5D061]'
              }`}
            >
              My Bookings
            </Link>
            <div className="border-l border-[#262830] h-6 mx-2"></div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-[#A0A5B5]">Athlete: <span className="font-bold text-white">{user.name}</span></span>
              <button 
                onClick={logout} 
                className="border border-[#D4AF37]/30 bg-transparent text-[#F5D061] hover:bg-[#D4AF37] hover:text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#07080A]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
    </div>
  );

  return (
    <Router>
      <div className="min-h-screen bg-[#07080A] font-sans selection:bg-[#D4AF37]/30 selection:text-white text-white">
        <Nav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/my-bookings" element={user ? <MyBookings /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
