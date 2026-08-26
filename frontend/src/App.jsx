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
    <nav className="bg-white border-b border-purple-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-fuchsia-500 tracking-tight">
              FitSlot
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <Link 
              to="/" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/' ? 'bg-purple-100 text-purple-800' : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'}`}
            >
              Gym Slots
            </Link>
            <Link 
              to="/my-bookings" 
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === '/my-bookings' ? 'bg-purple-100 text-purple-800' : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'}`}
            >
              My Bookings
            </Link>
            <div className="border-l border-purple-100 h-6 mx-2"></div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">Hi, <span className="font-semibold text-purple-900">{user.name}</span></span>
              <button 
                onClick={logout} 
                className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-md text-sm font-medium transition-all"
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
    <div className="min-h-screen flex items-center justify-center bg-purple-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );

  return (
    <Router>
      <div className="min-h-screen bg-purple-50/50 font-sans selection:bg-purple-200 text-slate-800">
        <Nav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
