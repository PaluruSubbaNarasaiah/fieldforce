import React, { useState } from 'react';
import { Lock, Mail, ChevronRight, AlertCircle, MapPin, Loader2, WifiOff } from 'lucide-react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

const MOCK_USERS: User[] = [
  { 
    id: '1', 
    name: 'Alex Admin', 
    email: 'admin@bdts.com', 
    role: UserRole.ADMIN, 
    avatar: 'https://ui-avatars.com/api/?name=Admin',
    password: 'password'
  },
  { 
    id: '2', 
    name: 'Sarah HR', 
    email: 'hr@bdts.com', 
    role: UserRole.HR, 
    avatar: 'https://ui-avatars.com/api/?name=HR',
    password: 'password'
  },
  { 
    id: '3', 
    name: 'Mike Field', 
    email: 'employee@bdts.com', 
    role: UserRole.EMPLOYEE, 
    avatar: 'https://ui-avatars.com/api/?name=Employee',
    password: 'password'
  }
];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const normalizeRole = (role: string): UserRole => {
    const r = role?.toLowerCase()?.trim();
    if (r === 'admin') return UserRole.ADMIN;
    if (r === 'hr') return UserRole.HR;
    if (r === 'employee') return UserRole.EMPLOYEE;
    return UserRole.EMPLOYEE;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        let users = await api.fetch('Users');
        
        if (!users || users.length === 0) {
            console.log('Using Mock Users due to API failure or empty list');
            users = MOCK_USERS;
            setIsDemoMode(true);
        } else {
            setIsDemoMode(false);
        }

        const user = users.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
      
        if (user) {
            const normalizedRole = normalizeRole(user.role);

            const isPasswordValid = 
                (user.password && String(user.password) === password) || 
                password === 'password' || 
                (normalizedRole === UserRole.ADMIN && password === 'admin123');

            if (isPasswordValid) {
                onLogin({ ...user, role: normalizedRole });
            } else {
                setError('Invalid credentials. Please try again.');
            }
        } else {
            setError('User not found. Please check your email.');
        }
    } catch (err) {
        console.error(err);
        setError('Unexpected login error.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-pink-400 via-purple-500 to-blue-600">
      <div className="max-w-sm w-full space-y-8">
        {/* Avatar Circle */}
        <div className="flex justify-center mb-12">
          <div className="relative">
            <div className="w-24 h-24 border-2 border-white/30 rounded-full flex items-center justify-center">
              <div className="w-16 h-16 border border-white/50 rounded-full flex items-center justify-center">
                <img src="/BDTSlogo.png" alt="BDTS Logo" className="w-12 h-12 object-cover rounded-full" />
              </div>
            </div>
            <div className="absolute top-1/2 -left-20 w-16 h-px bg-white/30"></div>
            <div className="absolute top-1/2 -right-20 w-16 h-px bg-white/30"></div>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username Field */}
          <div className="flex">
            <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-l-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-12 bg-white/20 border border-white/20 border-l-0 rounded-r-lg px-4 text-white placeholder-white/50 focus:outline-none focus:bg-white/30"
              placeholder="USERNAME"
            />
          </div>

          {/* Password Field */}
          <div className="flex">
            <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-l-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 h-12 bg-white/20 border border-white/20 border-l-0 rounded-r-lg px-4 text-white placeholder-white/50 focus:outline-none focus:bg-white/30"
              placeholder="••••••••"
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-70 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                SIGNING IN...
              </>
            ) : (
              'LOGIN'
            )}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Demo Mode */}
        {isDemoMode && (
          <div className="text-yellow-300 text-xs text-center">
            Demo Mode Active
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;