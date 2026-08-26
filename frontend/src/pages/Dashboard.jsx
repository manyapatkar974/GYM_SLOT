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
      setMessage('Session successfully booked!');
      fetchSlots();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
      fetchSlots();
      setTimeout(() => setError(''), 4000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-[#20222A] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#F5D061]">Live Training Schedule</span>
          <h2 className="text-3xl font-black tracking-tight text-white mt-1">Available Gym Sessions</h2>
          <p className="mt-2 text-sm text-[#A0A5B5]">Strict capacity limit of 10 athletes per private slot.</p>
        </div>
        <div className="inline-flex items-center gap-2 bg-[#121318] border border-[#D4AF37]/30 px-4 py-2 rounded-xl text-xs font-bold text-[#F5D061] tracking-wider uppercase shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#F5D061] animate-pulse"></span>
          Live Concurrency Guard
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slots.map(slot => {
          const available = slot.capacity - slot.booked_count;
          const isFull = available <= 0;
          const fillPercentage = (slot.booked_count / slot.capacity) * 100;
          
          return (
            <div 
              key={slot.id} 
              className="bg-[#121318] rounded-2xl shadow-2xl border border-[#232630] overflow-hidden hover:border-[#D4AF37]/60 hover:shadow-[#D4AF37]/5 transition-all duration-300 flex flex-col"
            >
              <div className="bg-[#181A22] px-6 py-5 border-b border-[#262934]">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-white tracking-wide">
                    {new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isFull 
                      ? 'bg-red-950/50 text-red-400 border border-red-800/40' 
                      : 'bg-[#2A261A] text-[#F5D061] border border-[#D4AF37]/40'
                  }`}>
                    {isFull ? 'Sold Out' : `${available} Available`}
                  </span>
                </div>
                <p className="text-[#D4AF37] text-sm mt-1.5 flex items-center gap-2 font-semibold">
                  <svg className="w-4 h-4 text-[#F5D061]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                </p>
              </div>
              
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-[#A0A5B5] mb-2.5">
                    <span>Capacity Fill</span>
                    <span className="text-white font-black">{slot.booked_count} / {slot.capacity} Booked</span>
                  </div>
                  <div className="w-full bg-[#20232D] rounded-full h-2.5 mb-6 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        isFull 
                          ? 'bg-red-500' 
                          : fillPercentage > 70 
                          ? 'bg-[#B89344]' 
                          : 'bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B89344]'
                      }`} 
                      style={{ width: `${fillPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <button 
                  onClick={() => handleBook(slot.id)}
                  disabled={isFull}
                  className={`w-full py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black ${
                    isFull 
                    ? 'bg-[#1C1E26] text-[#5A5E6B] cursor-not-allowed border border-[#2A2D38]' 
                    : 'bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B89344] hover:opacity-95 text-black shadow-lg shadow-[#D4AF37]/20 active:scale-[0.98]'
                  }`}
                >
                  {isFull ? 'Session Full' : 'Reserve Spot'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
