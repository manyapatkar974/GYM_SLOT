import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
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
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-purple-700/70 font-medium">
              Sign in to manage your gym sessions and stay on track.
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

            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="flex w-full justify-center rounded-xl border border-transparent bg-purple-600 py-3.5 px-4 text-sm font-bold text-white shadow-sm hover:bg-purple-700 hover:shadow-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>
            
            <p className="mt-8 text-center text-sm text-purple-700/80 font-medium">
              Not a member?{' '}
              <Link to="/register" className="font-bold text-purple-600 hover:text-purple-500">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image/Gradient banner */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-fuchsia-100 via-purple-100 to-white flex flex-col justify-center items-center p-12 text-center border-l border-purple-100">
          <div className="bg-white p-6 rounded-full shadow-xl shadow-purple-200/50 mb-8">
            <svg className="w-20 h-20 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h2 className="text-4xl font-extrabold text-purple-950 mb-4 tracking-tight">Commit to be Fit</h2>
          <p className="text-lg text-purple-800/70 max-w-md font-medium">Reserve your equipment, plan your workout, and crush your goals with our seamless booking system.</p>
        </div>
      </div>
    </div>
  );
}
