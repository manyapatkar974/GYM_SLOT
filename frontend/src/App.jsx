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
    <nav className="bg-[#1C1E24] border-b border-[#2C2F38] shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#E5C378] via-[#D4AF37] to-[#C5A059] tracking-wider uppercase">
              FitSlot
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <Link 
              to="/" 
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors tracking-wide ${
                location.pathname === '/' 
                  ? 'bg-[#2A2D36] text-[#E5C378] border border-[#D4AF37]/30' 
                  : 'text-[#EFECE4]/80 hover:bg-[#2A2D36] hover:text-[#E5C378]'
              }`}
            >
              Gym Slots
            </Link>
            <Link 
              to="/my-bookings" 
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors tracking-wide ${
                location.pathname === '/my-bookings' 
                  ? 'bg-[#2A2D36] text-[#E5C378] border border-[#D4AF37]/30' 
                  : 'text-[#EFECE4]/80 hover:bg-[#2A2D36] hover:text-[#E5C378]'
              }`}
            >
              My Bookings
            </Link>
            <div className="border-l border-[#2C2F38] h-6 mx-2"></div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#EFECE4]/70">Member: <span className="font-semibold text-[#FAF8F5]">{user.name}</span></span>
              <button 
                onClick={logout} 
                className="border border-[#C5A059]/40 bg-transparent text-[#E5C378] hover:bg-[#C5A059] hover:text-[#1C1E24] px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
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
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
    </div>
  );

  return (
    <Router>
      <div className="min-h-screen bg-[#FAF8F5] font-sans selection:bg-[#E5C378]/30 selection:text-[#1C1E24] text-[#1C1E24]">
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
