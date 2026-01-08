import React from 'react';
import { 
  Settings,
  LogOut,
  MapPin
} from 'lucide-react';
import { User } from '../types';
import { MENU_ITEMS } from '../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isMobileOpen, setIsMobileOpen, user, onLogout }) => {
  
  const filteredItems = MENU_ITEMS.filter(item => 
    user ? item.roles.includes(user.role) : false
  );

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:inset-auto
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
              <img src="/Bdts.png" alt="BDTS Logo" className="w-8 h-8 object-contain" />
              <span>BDTS</span>
            </div>
            <button onClick={() => setIsMobileOpen(false)} className="md:hidden">
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors
                      ${activeTab === item.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-700">
            {/* User Profile Section */}
            <div className="flex items-center gap-3 px-4 mb-4">
              <img 
                src={user?.avatar || "https://picsum.photos/40/40"} 
                alt="User" 
                className="w-8 h-8 rounded-full border border-slate-600"
              />
              <div className="text-sm overflow-hidden">
                <p className="text-white font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-slate-500 text-xs truncate">{user?.role || 'Guest'}</p>
              </div>
            </div>

            <button className="flex items-center gap-3 px-4 py-2 w-full text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button 
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-2 w-full text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors mt-1"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
