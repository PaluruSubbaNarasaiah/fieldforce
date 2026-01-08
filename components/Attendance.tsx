import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Check, AlertCircle, Loader2, RefreshCw, Settings, Navigation } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface AttendanceProps {
  user: User;
}

const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  const [status, setStatus] = useState<'Checked In' | 'Checked Out' | 'Loading'>('Loading');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Helper: Get local YYYY-MM-DD string to ensure consistency across Timezones
  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    getCurrentLocation();
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    try {
        const data = await api.fetch('Attendance');
        
        // Filter history for current user
        let userHistory = data.filter((item: any) => String(item.userId) === String(user.id));
        
        // Sort by ID descending so we look at latest first
        userHistory = userHistory.sort((a: any, b: any) => Number(b.id) - Number(a.id)); 

        const todayStr = getTodayDateString();
        
        // Find the LATEST record for today
        const activeSession = userHistory.find((item: any) => {
            // Check if record date matches today's local date
            // We support both exact string match or ISO string inclusion just in case legacy data exists
            const isToday = item.date === todayStr || (item.date && item.date.startsWith(todayStr));
            return isToday && item.inTime && (!item.outTime || item.outTime === '');
        });
        
        if (activeSession) {
            setStatus('Checked In');
            setCurrentSessionId(activeSession.id);
        } else {
            setStatus('Checked Out');
            setCurrentSessionId(null);
        }

        setHistory(userHistory); 
    } catch (e) {
        console.error("Failed to load history", e);
        setError("Could not sync attendance status.");
        setStatus('Checked Out'); 
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoadingAction(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLoadingAction(false);
        setError(null);
      },
      (err) => {
        console.error(err);
        let msg = 'Unable to retrieve location.';
        if (err.code === 1) msg = 'Location access denied. Please enable location permissions.';
        else if (err.code === 2) msg = 'GPS signal unavailable.';
        else if (err.code === 3) msg = 'Location request timed out.';
        
        setError(msg);
        setLoadingAction(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleToggle = async () => {
    if (!location) {
      getCurrentLocation();
      return; // Wait for location update
    }
    
    setLoadingAction(true);
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = getTodayDateString();
    
    try {
        if (status === 'Checked Out') {
            // --- PUNCH IN ---
            const newId = Date.now().toString(); 
            const newSession = {
                id: newId,
                userId: user.id,
                date: dateString,
                inTime: timeString,
                outTime: '',
                location: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
                status: 'Present'
            };
            
            // Optimistic Update
            setStatus('Checked In'); 
            setCurrentSessionId(newId);
            setHistory(prev => [newSession, ...prev]);

            // API Call
            await api.create('Attendance', newSession);
            
        } else {
            // --- PUNCH OUT ---
            let targetId = currentSessionId;

            // Fallback: Find open session in local history if ID is lost
            if (!targetId) {
                const active = history.find(h => !h.outTime && (h.date === dateString || h.date.startsWith(dateString)));
                if (active) targetId = active.id;
            }

            if (targetId) {
                // Optimistic Update
                setStatus('Checked Out');
                setHistory(prev => prev.map(h => 
                    h.id === targetId ? { ...h, outTime: timeString } : h
                ));
                setCurrentSessionId(null);

                // API Call
                await api.update('Attendance', {
                    id: targetId,
                    outTime: timeString
                });
            } else {
                 setError("Active session not found. Please refresh.");
                 await loadHistory();
            }
        }
    } catch (err) {
        console.error(err);
        setError("Network error. Changes saved locally but sync failed.");
        // We keep the optimistic state to prevent jarring UX
    } finally {
        setLoadingAction(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="text-center space-y-4">
          <div className="flex justify-between items-start">
             <div>
                <h2 className="text-2xl font-bold text-slate-900 text-left">Geo-Attendance</h2>
                <p className="text-slate-500 text-sm text-left">Mark your daily attendance with GPS.</p>
             </div>
             <button onClick={getCurrentLocation} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors" title="Refresh GPS">
                <RefreshCw className={`w-4 h-4 text-slate-600 ${loadingAction && !status ? 'animate-spin' : ''}`} />
             </button>
          </div>
          
          <div className="flex justify-center py-8">
            {status === 'Loading' ? (
                 <div className="w-56 h-56 rounded-full flex flex-col items-center justify-center bg-slate-50 border-4 border-slate-100">
                    <Loader2 className="w-10 h-10 text-slate-400 animate-spin mb-2" />
                    <span className="text-slate-500 text-sm">Syncing Status...</span>
                 </div>
            ) : (
                <button
                onClick={handleToggle}
                disabled={loadingAction || !location}
                className={`
                    relative w-56 h-56 rounded-full flex flex-col items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                    ${status === 'Checked In' 
                    ? 'bg-gradient-to-br from-red-500 to-red-600 ring-8 ring-red-100 shadow-red-200' 
                    : 'bg-gradient-to-br from-green-500 to-emerald-600 ring-8 ring-green-100 shadow-green-200'}
                `}
                >
                {loadingAction ? (
                    <div className="flex flex-col items-center">
                        <Loader2 className="animate-spin h-10 w-10 text-white mb-2" />
                        <span className="text-white text-xs font-medium">Updating...</span>
                    </div>
                ) : (
                    <>
                    <div className="text-white text-6xl font-black tracking-wider drop-shadow-md">
                        {status === 'Checked In' ? 'OUT' : 'IN'}
                    </div>
                    <span className="text-white/90 text-sm font-bold uppercase tracking-wider bg-black/10 px-3 py-1 rounded-full">
                        {status === 'Checked In' ? 'Punch Out' : 'Punch In'}
                    </span>
                    </>
                )}
                </button>
            )}
          </div>

          <div className={`flex justify-center items-center gap-2 text-sm py-2 px-4 rounded-full mx-auto w-fit border transition-colors ${location ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
            <MapPin className="w-4 h-4" />
            {location ? (
              <span className="font-mono">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
            ) : (
              <span>Waiting for GPS...</span>
            )}
          </div>
          
          {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 animate-fade-in flex flex-col items-center gap-1 text-center">
                  <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                      <AlertCircle className="w-4 h-4"/> Location Service Error
                  </div>
                  <p className="text-red-600 text-xs">{error}</p>
                  {!location && (
                       <button 
                           onClick={getCurrentLocation}
                           className="mt-1 text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-full font-medium transition-colors"
                       >
                           Try Enabling GPS & Retry
                       </button>
                  )}
              </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-100">
             <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Current Time</p>
                <p className="text-lg font-mono font-medium text-slate-800">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
             </div>
             <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Today's Date</p>
                <p className="text-lg font-mono font-medium text-slate-800">{new Date().toLocaleDateString()}</p>
             </div>
             <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Shift Hours</p>
                <p className="text-lg font-mono font-medium text-slate-800">9AM - 6PM</p>
             </div>
             <div className="text-center p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Status</p>
                <p className={`text-lg font-bold ${status === 'Checked In' ? 'text-green-600' : 'text-slate-400'}`}>
                    {status === 'Checked In' ? 'ONLINE' : status === 'Loading' ? '...' : 'OFFLINE'}
                </p>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
           <h3 className="font-semibold text-slate-800 flex items-center gap-2">
             <Clock className="w-4 h-4" /> Recent Activity
           </h3>
           <button onClick={loadHistory} className="text-blue-600 hover:text-blue-700 text-sm font-medium">Refresh</button>
        </div>
        <div className="overflow-x-auto">
          {status === 'Loading' ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600"/></div>
          ) : (
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">In</th>
                <th className="px-6 py-3">Out</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-4">No history found.</td></tr>
              ) : history.slice(0, 10).map((record, idx) => (
                <tr key={record.id || idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{record.date}</td>
                  <td className="px-6 py-4 text-green-600 font-medium">{record.inTime}</td>
                  <td className="px-6 py-4 text-red-600 font-medium">{record.outTime || '--:--'}</td>
                  <td className="px-6 py-4 flex items-center gap-1 font-mono text-xs truncate max-w-[150px]" title={record.location}>
                    <MapPin className="w-3 h-3 text-slate-400" /> {record.location}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Check className="w-3 h-3" /> {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;