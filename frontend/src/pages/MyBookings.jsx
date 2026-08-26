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
      <div className="border-b border-[#E5E0D5] pb-6 flex justify-between items-end">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#B89344]">Workout Schedule</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1C1E24] mt-1">My Reserved Sessions</h2>
          <p className="mt-2 text-sm text-[#6C717E]">Manage your scheduled gym sessions.</p>
        </div>
        <div className="bg-[#EFECE4] border border-[#E5E0D5] text-[#1C1E24] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
          Total: {bookings.length} Sessions
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm">
          <p className="text-sm text-red-800 font-semibold">{error}</p>
        </div>
      )}
      
      {message && (
        <div className="bg-[#FAF6EC] border border-[#D4AF37]/40 p-4 rounded-xl shadow-sm">
          <p className="text-sm text-[#8C6D27] font-semibold">{message}</p>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#E5E0D5] shadow-sm">
          <div className="w-16 h-16 mx-auto bg-[#EFECE4] rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-[#B89344]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <h3 className="text-base font-bold text-[#1C1E24]">No reservations found</h3>
          <p className="mt-1 text-sm text-[#6C717E]">You do not have any active gym bookings.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D5] overflow-hidden">
          <ul className="divide-y divide-[#E5E0D5]">
            {bookings.map(b => (
              <li key={b.id} className="p-6 hover:bg-[#FAF8F5] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-5">
                    <div className="bg-[#1C1E24] border border-[#2C2F38] text-[#E5C378] rounded-xl p-3 text-center min-w-[75px] shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#E5C378]/70">{new Date(b.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                      <div className="text-2xl font-black text-[#FAF8F5]">{new Date(b.date).toLocaleDateString('en-US', { day: 'numeric' })}</div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-[#1C1E24]">{b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}</h4>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          b.status === 'ACTIVE' 
                            ? 'bg-[#FAF6EC] text-[#8C6D27] border border-[#D4AF37]/50' 
                            : 'bg-[#EFECE4] text-[#6C717E]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${b.status === 'ACTIVE' ? 'bg-[#D4AF37]' : 'bg-[#6C717E]'}`}></span>
                          {b.status}
                        </span>
                        <span className="text-xs text-[#6C717E]">Reserved on {new Date(b.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {b.status === 'ACTIVE' && (
                    <button 
                      onClick={() => handleCancel(b.id)}
                      className="border border-red-300 bg-white text-red-700 hover:bg-red-50 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
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
