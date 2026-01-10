import React, { useState } from 'react';
import { Menu, Search, Bell, AlertCircle } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Attendance from './components/Attendance';
import Visits from './components/Visits';
import Tasks from './components/Tasks';
import Leads from './components/Leads';
import MapTracker from './components/MapTracker';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import Onboarding from './components/Onboarding';
import Orders from './components/Orders';
import Expenses from './components/Expenses';
import PhotoProof from './components/PhotoProof';
import PhotoGallery from './components/PhotoGallery';
import Settings from './components/Settings';
import Notifications from './components/Notifications';
import GPSNavigation from './components/GPSNavigation';
import { User } from './types';
import { MENU_ITEMS } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setActiveTab('dashboard'); // Reset to dashboard on login
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('dashboard');
  };

  // If not logged in, show login screen
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    // Check Permissions
    const currentMenuItem = MENU_ITEMS.find(item => item.id === activeTab);
    
    // If permission exists and user role is not included, deny access
    if (currentMenuItem && !currentMenuItem.roles.includes(user.role)) {
       return (
         <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fade-in">
             <div className="bg-red-50 p-6 rounded-full mb-6">
                 <AlertCircle className="w-12 h-12 text-red-500" />
             </div>
             <h2 className="text-2xl font-bold text-slate-800 mb-3">Access Denied</h2>
             <p className="text-slate-500 max-w-md leading-relaxed mb-4">
                 You do not have the required permissions to access the <span className="font-semibold text-slate-700">{currentMenuItem.label}</span> module. 
                 Please contact your system administrator.
             </p>
             <p className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full mb-8">
                Current Role: <span className="font-mono font-medium text-slate-600">{user.role}</span>
             </p>
             <button 
                 onClick={() => setActiveTab('dashboard')}
                 className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
             >
                 Return to Dashboard
             </button>
         </div>
       );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} onNavigate={setActiveTab} />;
      case 'users': return <UserManagement currentUser={user} />;
      case 'onboarding': return <Onboarding />;
      case 'attendance': return <Attendance user={user} />;
      case 'visits': return <Visits />;
      case 'tasks': return <Tasks user={user} />;
      case 'leads': return <Leads />;
      case 'orders': return <Orders />;
      case 'expenses': return <Expenses user={user} />;
      case 'tracking': return <MapTracker />;
      case 'navigation': return <GPSNavigation user={user} />;
      case 'proof': return <PhotoProof user={user} />;
      case 'gallery': return <PhotoGallery />;
      case 'settings': return <Settings user={user} />;
      default: return <Dashboard user={user} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-800 sm:hidden">BDTS</h1>
            <div className="hidden sm:flex items-center gap-2 text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 w-64 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <Search className="w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-sm text-slate-800 w-full placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
              <Notifications 
                user={user} 
                isOpen={showNotifications} 
                onClose={() => setShowNotifications(false)} 
              />
            </div>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm border border-blue-200 overflow-hidden">
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="text-xs text-left hidden lg:block">
                <p className="font-medium text-slate-900">{user.name}</p>
                <p className="text-slate-500">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
           <div className="max-w-7xl mx-auto">
             {renderContent()}
           </div>
        </main>
      </div>
    </div>
  );
};

export default App;