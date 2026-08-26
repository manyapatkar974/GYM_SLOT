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
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      setError('');
      setMessage('');
      await api.delete(`/bookings/${id}`);
      setMessage('Booking successfully cancelled!');
      fetchBookings();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation failed');
      setTimeout(() => setError(''), 4000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-purple-200 pb-5 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-purple-950">My Bookings</h2>
          <p className="mt-2 text-sm text-purple-700/70">View and manage your upcoming gym sessions.</p>
        </div>
        <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl text-sm font-semibold">
          Total Bookings: {bookings.length}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md shadow-sm">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}
      
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-md shadow-sm">
          <p className="text-sm text-emerald-700 font-medium">{message}</p>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-purple-200 shadow-sm">
          <svg className="mx-auto h-12 w-12 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <h3 className="mt-2 text-sm font-semibold text-purple-900">No bookings</h3>
          <p className="mt-1 text-sm text-purple-600/70">You haven't booked any gym sessions yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
          <ul className="divide-y divide-purple-50">
            {bookings.map(b => (
              <li key={b.id} className="p-6 hover:bg-purple-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-purple-100 text-purple-700 rounded-xl p-3 text-center min-w-[70px]">
                      <div className="text-xs font-bold uppercase">{new Date(b.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                      <div className="text-xl font-black">{new Date(b.date).toLocaleDateString('en-US', { day: 'numeric' })}</div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-purple-950">{b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}</h4>
                      <div className="mt-1 flex items-center gap-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          b.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${b.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {b.status}
                        </span>
                        <span className="text-xs text-purple-600/60 font-medium">Booked on {new Date(b.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {b.status === 'ACTIVE' && (
                    <button 
                      onClick={() => handleCancel(b.id)}
                      className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
