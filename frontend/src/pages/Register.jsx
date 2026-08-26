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
      {/* Left side - Dark Black Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-8 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 bg-[#0A0B0E]">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#F5D061]"></span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#F5D061]">Membership</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white">
              Join FitSlot
            </h2>
            <p className="mt-2 text-sm text-[#A0A5B5]">
              Create an account to begin reserving scheduled slots.
            </p>
          </div>

          <div className="mt-8">
            {error && (
              <div className="mb-6 rounded-xl bg-red-950/60 p-4 border border-red-800/80">
                <p className="text-sm font-semibold text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                  Full Name
                </label>
                <div className="mt-1.5">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-[#262830] bg-[#14151C] px-4 py-3.5 text-white placeholder-[#5A5E6B] focus:border-[#F5D061] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 sm:text-sm transition-all"
                    placeholder="Alex Morgan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                  Email Address
                </label>
                <div className="mt-1.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-[#262830] bg-[#14151C] px-4 py-3.5 text-white placeholder-[#5A5E6B] focus:border-[#F5D061] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 sm:text-sm transition-all"
                    placeholder="alex@domain.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4AF37]">
                  Password
                </label>
                <div className="mt-1.5">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-[#262830] bg-[#14151C] px-4 py-3.5 text-white placeholder-[#5A5E6B] focus:border-[#F5D061] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 sm:text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full justify-center rounded-xl bg-gradient-to-r from-[#F5D061] via-[#D4AF37] to-[#B89344] hover:opacity-95 py-3.5 px-4 text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-[#D4AF37]/20 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </form>
            
            <p className="mt-8 text-center text-sm text-[#A0A5B5]">
              Already registered?{' '}
              <Link to="/login" className="font-bold text-[#F5D061] hover:text-[#E5C378]">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Pure Dark Black Luxury Banner with Metallic Gold Icons */}
      <div className="relative hidden w-0 flex-1 lg:block bg-[#07080A] border-l border-[#20222A]">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-bl from-[#0D0E12] via-[#07080A] to-black flex flex-col justify-center items-center p-12 text-center">
          <div className="bg-[#14151C] p-6 rounded-2xl border border-[#D4AF37]/30 shadow-2xl shadow-black mb-8">
            <svg className="w-20 h-20 text-[#F5D061]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#F5D061] mb-2">Exclusive Access</span>
          <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Zero Compromise</h2>
          <p className="text-base text-[#A0A5B5] max-w-md font-medium">Join an exclusive athletic facility where peak-hour capacity is strictly respected and guaranteed.</p>
        </div>
      </div>
    </div>
  );
}
