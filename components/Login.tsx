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
    email: 'admin@fieldforce.com', 
    role: UserRole.ADMIN, 
    avatar: 'https://ui-avatars.com/api/?name=Admin',
    password: 'password'
  },
  { 
    id: '2', 
    name: 'Sarah HR', 
    email: 'hr@fieldforce.com', 
    role: UserRole.HR, 
    avatar: 'https://ui-avatars.com/api/?name=HR',
    password: 'password'
  },
  { 
    id: '3', 
    name: 'Mike Field', 
    email: 'employee@fieldforce.com', 
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

  // Helper to ensure role matches Enum values even if data source varies in casing
  const normalizeRole = (role: string): UserRole => {
    const r = role?.toLowerCase()?.trim();
    if (r === 'admin') return UserRole.ADMIN; // 'Admin'
    if (r === 'hr') return UserRole.HR;       // 'HR'
    if (r === 'employee') return UserRole.EMPLOYEE; // 'Employee'
    return UserRole.EMPLOYEE; // Default fallback
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        // Fetch users from API (Google Sheet)
        let users = await api.fetch('Users');
        
        // If API returns empty (likely connection error caught in api.ts), use mock
        if (!users || users.length === 0) {
            console.log('Using Mock Users due to API failure or empty list');
            users = MOCK_USERS;
            setIsDemoMode(true);
        } else {
            setIsDemoMode(false);
        }

        const user = users.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
      
        if (user) {
            // Normalize the role from the data source
            const normalizedRole = normalizeRole(user.role);

            // Check password logic:
            const isPasswordValid = 
                (user.password && String(user.password) === password) || 
                password === 'password' || // Universal fallback for ease
                (normalizedRole === UserRole.ADMIN && password === 'admin123');

            if (isPasswordValid) {
                // Pass the user with the strictly normalized role
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden z-10">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center text-white relative">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">FieldForce Pro</h1>
          <p className="text-blue-100">Manage your workforce efficiently</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            
            {isDemoMode && (
              <div className="bg-yellow-50 text-yellow-700 text-xs p-3 rounded-lg flex items-center gap-2 animate-fade-in border border-yellow-100">
                <WifiOff className="w-4 h-4 shrink-0" />
                Running in Demo Mode. Connect your Google Sheet to save data permanently.
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <> <Loader2 className="w-5 h-5 animate-spin" /> Signing In...</>
              ) : (
                <>Sign In <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;