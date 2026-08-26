import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function Dashboard() {
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchSlots = async () => {
    try {
      const res = await api.get('/slots');
      setSlots(res.data.data);
    } catch (err) {
      setError('Failed to load slots');
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const handleBook = async (slotId) => {
    try {
      setError('');
      setMessage('');
      await api.post('/bookings', { slotId });
      setMessage('Booking successful!');
      fetchSlots();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
      fetchSlots();
      setTimeout(() => setError(''), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-purple-200 pb-5">
        <h2 className="text-3xl font-bold tracking-tight text-purple-950">Available Sessions</h2>
        <p className="mt-2 text-sm text-purple-700/70">Book your next workout slot. Maximum 10 people per session.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md shadow-sm">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-md shadow-sm">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-emerald-700 font-medium">{message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slots.map(slot => {
          const available = slot.capacity - slot.booked_count;
          const isFull = available <= 0;
          const fillPercentage = (slot.booked_count / slot.capacity) * 100;
          
          return (
            <div key={slot.id} className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden hover:shadow-md hover:border-purple-300 transition-all duration-300 flex flex-col">
              <div className="bg-gradient-to-r from-purple-50 to-white px-6 py-4 border-b border-purple-100">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-purple-900">
                    {new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isFull ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isFull ? 'Full' : `${available} spots left`}
                  </span>
                </div>
                <p className="text-purple-600/80 text-sm mt-1 flex items-center gap-1 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                </p>
              </div>
              
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <div className="flex justify-between text-sm text-slate-500 mb-2">
                    <span>Capacity filled</span>
                    <span className="font-semibold text-purple-900">{slot.booked_count} / {slot.capacity}</span>
                  </div>
                  <div className="w-full bg-purple-100 rounded-full h-2.5 mb-6 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : fillPercentage > 70 ? 'bg-fuchsia-400' : 'bg-purple-500'}`} 
                      style={{ width: `${fillPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <button 
                  onClick={() => handleBook(slot.id)}
                  disabled={isFull}
                  className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isFull 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm hover:shadow-purple-500/30 focus:ring-purple-500 active:scale-[0.98]'
                  }`}
                >
                  {isFull ? 'Session Full' : 'Book Now'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
