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
      setMessage('Session successfully reserved!');
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
      <div className="border-b border-[#E5E0D5] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#B89344]">Reserve Training Session</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1C1E24] mt-1">Available Gym Sessions</h2>
          <p className="mt-2 text-sm text-[#6C717E]">Strict capacity limit of 10 athletes per private slot.</p>
        </div>
        <div className="inline-flex items-center gap-2 bg-[#EFECE4] border border-[#E5E0D5] px-4 py-2 rounded-xl text-xs font-bold text-[#1C1E24] tracking-wider uppercase">
          <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
          Live Concurrency Control
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slots.map(slot => {
          const available = slot.capacity - slot.booked_count;
          const isFull = available <= 0;
          const fillPercentage = (slot.booked_count / slot.capacity) * 100;
          
          return (
            <div 
              key={slot.id} 
              className="bg-white rounded-2xl shadow-sm border border-[#E5E0D5] overflow-hidden hover:shadow-lg hover:border-[#D4AF37]/50 transition-all duration-300 flex flex-col"
            >
              <div className="bg-[#1C1E24] px-6 py-5 border-b border-[#2C2F38]">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-[#FAF8F5] tracking-wide">
                    {new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isFull 
                      ? 'bg-[#2A2D36] text-[#EFECE4]/60 border border-[#3E424E]' 
                      : 'bg-[#FAF6EC] text-[#8C6D27] border border-[#D4AF37]/50'
                  }`}>
                    {isFull ? 'Sold Out' : `${available} Available`}
                  </span>
                </div>
                <p className="text-[#E5C378] text-sm mt-1.5 flex items-center gap-2 font-medium">
                  <svg className="w-4 h-4 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                </p>
              </div>
              
              <div className="p-6 flex-grow flex flex-col justify-between bg-white">
                <div>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-[#6C717E] mb-2">
                    <span>Capacity Meter</span>
                    <span className="text-[#1C1E24]">{slot.booked_count} / {slot.capacity} Booked</span>
                  </div>
                  <div className="w-full bg-[#EFECE4] rounded-full h-2.5 mb-6 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        isFull 
                          ? 'bg-[#6C717E]' 
                          : fillPercentage > 70 
                          ? 'bg-[#C5A059]' 
                          : 'bg-gradient-to-r from-[#D4AF37] to-[#B89344]'
                      }`} 
                      style={{ width: `${fillPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <button 
                  onClick={() => handleBook(slot.id)}
                  disabled={isFull}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isFull 
                    ? 'bg-[#EFECE4] text-[#6C717E] cursor-not-allowed border border-[#E5E0D5]' 
                    : 'bg-[#1C1E24] hover:bg-[#2A2D36] text-[#E5C378] border border-[#D4AF37]/40 shadow-sm hover:shadow-md active:scale-[0.98]'
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
