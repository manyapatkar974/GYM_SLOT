import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/my');
      setBookings(res.data.data);
    } catch (err) {
      setError('Failed to load bookings');
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      setError('');
      setMessage('');
      await api.delete(`/bookings/${id}`);
      setMessage('Reservation cancelled and spot restored!');
      fetchBookings();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation failed');
      setTimeout(() => setError(''), 4000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="border-b border-[#20222A] pb-6 flex justify-between items-end">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#F5D061]">Personal Schedule</span>
          <h2 className="text-3xl font-black tracking-tight text-white mt-1">My Reserved Sessions</h2>
          <p className="mt-2 text-sm text-[#A0A5B5]">Manage your confirmed gym slots.</p>
        </div>
        <div className="bg-[#181A22] border border-[#D4AF37]/30 text-[#F5D061] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
          Total: {bookings.length} Sessions
        </div>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-800/80 p-4 rounded-xl shadow-lg">
          <p className="text-sm text-red-300 font-semibold">{error}</p>
        </div>
      )}
      
      {message && (
        <div className="bg-[#1C1E26] border border-[#D4AF37] p-4 rounded-xl shadow-lg shadow-[#D4AF37]/10">
          <p className="text-sm text-[#F5D061] font-semibold">{message}</p>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-[#121318] rounded-2xl border border-dashed border-[#232630] shadow-2xl">
          <div className="w-16 h-16 mx-auto bg-[#1C1E26] border border-[#D4AF37]/30 rounded-2xl flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-[#F5D061]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <h3 className="text-base font-bold text-white">No active reservations</h3>
          <p className="mt-1 text-sm text-[#A0A5B5]">You do not have any upcoming gym bookings.</p>
        </div>
      ) : (
        <div className="bg-[#121318] rounded-2xl shadow-2xl border border-[#232630] overflow-hidden">
          <ul className="divide-y divide-[#20222A]">
            {bookings.map(b => (
              <li key={b.id} className="p-6 hover:bg-[#181A22] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-5">
                    <div className="bg-[#07080A] border border-[#D4AF37]/40 text-[#F5D061] rounded-xl p-3 text-center min-w-[75px] shadow-lg">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#A0A5B5]">{new Date(b.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                      <div className="text-2xl font-black text-white">{new Date(b.date).toLocaleDateString('en-US', { day: 'numeric' })}</div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white">{b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}</h4>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          b.status === 'ACTIVE' 
                            ? 'bg-[#2A261A] text-[#F5D061] border border-[#D4AF37]/50' 
                            : 'bg-[#1C1E26] text-[#5A5E6B] border border-[#262830]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${b.status === 'ACTIVE' ? 'bg-[#F5D061]' : 'bg-[#5A5E6B]'}`}></span>
                          {b.status}
                        </span>
                        <span className="text-xs text-[#A0A5B5]">Booked on {new Date(b.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {b.status === 'ACTIVE' && (
                    <button 
                      onClick={() => handleCancel(b.id)}
                      className="border border-red-500/40 bg-red-950/20 text-red-400 hover:bg-red-900/30 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
