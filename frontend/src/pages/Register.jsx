import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register } = useContext(AuthContext);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(name, email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] -mt-10 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Left side - Form on Warm Beige */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-8 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 bg-[#FAF8F5]">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#B89344]">Membership</span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1C1E24]">
              Join FitSlot
            </h2>
            <p className="mt-2 text-sm text-[#6C717E]">
              Create an account to begin reserving scheduled slots.
            </p>
          </div>

          <div className="mt-8">
            {error && (
              <div className="mb-6 rounded-xl bg-red-50 p-4 border border-red-200">
                <p className="text-sm font-semibold text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1E24]">
                  Full Name
                </label>
                <div className="mt-1.5">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-[#E5E0D5] bg-white px-4 py-3 text-[#1C1E24] placeholder-[#6C717E]/50 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 sm:text-sm transition-all"
                    placeholder="Alex Morgan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1E24]">
                  Email Address
                </label>
                <div className="mt-1.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-[#E5E0D5] bg-white px-4 py-3 text-[#1C1E24] placeholder-[#6C717E]/50 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 sm:text-sm transition-all"
                    placeholder="alex@domain.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1E24]">
                  Password
                </label>
                <div className="mt-1.5">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-[#E5E0D5] bg-white px-4 py-3 text-[#1C1E24] placeholder-[#6C717E]/50 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 sm:text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full justify-center rounded-xl bg-[#1C1E24] hover:bg-[#2A2D36] border border-[#D4AF37]/40 py-3.5 px-4 text-xs font-bold uppercase tracking-widest text-[#E5C378] shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </form>
            
            <p className="mt-8 text-center text-sm text-[#6C717E]">
              Already registered?{' '}
              <Link to="/login" className="font-bold text-[#B89344] hover:text-[#D4AF37]">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Charcoal Luxury Banner with Gold Icons */}
      <div className="relative hidden w-0 flex-1 lg:block bg-[#1C1E24] border-l border-[#2C2F38]">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-bl from-[#1C1E24] via-[#121316] to-[#0A0B0D] flex flex-col justify-center items-center p-12 text-center">
          <div className="bg-[#2A2D36] p-6 rounded-2xl border border-[#D4AF37]/30 shadow-2xl mb-8">
            <svg className="w-20 h-20 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#E5C378] mb-2">Exclusive Access</span>
          <h2 className="text-4xl font-black text-[#FAF8F5] mb-4 tracking-tight">Zero Compromise</h2>
          <p className="text-base text-[#EFECE4]/70 max-w-md font-medium">Join an exclusive athletic facility where peak-hour capacity is strictly respected and guaranteed.</p>
        </div>
      </div>
    </div>
  );
}
