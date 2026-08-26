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
    <div className="flex min-h-[calc(100vh-4rem)] -mt-8 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Left side - Form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <h2 className="mt-8 text-3xl font-extrabold tracking-tight text-purple-950">
              Start your journey
            </h2>
            <p className="mt-2 text-sm text-purple-700/70 font-medium">
              Create an account to start booking gym sessions today.
            </p>
          </div>

          <div className="mt-8">
            {error && (
              <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-purple-900">
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-purple-200 bg-purple-50/30 px-4 py-3 text-slate-800 placeholder-purple-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 sm:text-sm transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-purple-900">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-purple-200 bg-purple-50/30 px-4 py-3 text-slate-800 placeholder-purple-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 sm:text-sm transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-purple-900">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-purple-200 bg-purple-50/30 px-4 py-3 text-slate-800 placeholder-purple-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 sm:text-sm transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full justify-center rounded-xl border border-transparent bg-purple-600 py-3.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-purple-700 hover:shadow-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
                </button>
              </div>
            </form>
            
            <p className="mt-8 text-center text-sm text-purple-700/80 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-purple-600 hover:text-purple-500">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image/Gradient banner */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-bl from-purple-100 via-fuchsia-100 to-white flex flex-col justify-center items-center p-12 text-center border-l border-purple-100">
          <div className="bg-white p-6 rounded-full shadow-xl shadow-fuchsia-200/50 mb-8">
            <svg className="w-20 h-20 text-fuchsia-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h2 className="text-4xl font-extrabold text-purple-950 mb-4 tracking-tight">No Excuses</h2>
          <p className="text-lg text-purple-800/70 max-w-md font-medium">Join hundreds of others who have transformed their routines with guaranteed slot reservations.</p>
        </div>
      </div>
    </div>
  );
}
