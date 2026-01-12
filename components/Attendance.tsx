import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Check, AlertCircle, Loader2, RefreshCw, Settings, Navigation } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface AttendanceProps {
  user: User;
}

const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  const [status, setStatus] = useState<'Checked In' | 'Checked Out' | 'On Break'>('Checked Out');
  const [breakStatus, setBreakStatus] = useState<'Break In' | 'Break Out'>('Break Out');
  const [currentBreakId, setCurrentBreakId] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    // Do nothing - no auto loading or syncing
  }, [user]);

  const loadHistory = async () => {
    try {
        const data = await api.fetch('Attendance');
        let userHistory = data.filter((item: any) => String(item.userId) === String(user.id));
        userHistory = userHistory.sort((a: any, b: any) => Number(b.id) - Number(a.id)); 
        const todayStr = getTodayDateString();
        
        const activeSession = userHistory.find((item: any) => {
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
        console.warn('GPS Error:', err);
        let msg = 'Unable to retrieve location.';
        if (err.code === 1) msg = 'Location access denied. Please enable location permissions.';
        else if (err.code === 2) msg = 'GPS signal unavailable.';
        else if (err.code === 3) msg = 'Location request timed out. Retrying...';
        
        setError(msg);
        setLoadingAction(false);
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 }
    );
  };

  const handleToggle = async () => {
    if (!location) {
      setError('Please get your location first by clicking the GPS refresh button.');
      return;
    }
    
    setLoadingAction(true);
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const dateString = getTodayDateString();
    
    try {
        if (status === 'Checked Out') {
            const newId = Date.now().toString(); 
            const newSession = {
                id: newId,
                userId: user.id,
                date: dateString,
                inTime: timeString,
                outTime: '',
                location: `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
                status: 'Present',
                totalHours: ''
            };
            
            setStatus('Checked In'); 
            setCurrentSessionId(newId);
            setHistory(prev => [newSession, ...prev]);

            const result = await api.create('Attendance', newSession);
            console.log('Punch In Result:', result);
            
            if (result.status !== 'success') {
              setStatus('Checked Out');
              setCurrentSessionId(null);
              setHistory(prev => prev.filter(h => h.id !== newId));
              setError('Failed to punch in. Please try again.');
            }
            
        } else {
            let targetId = currentSessionId;

            if (!targetId) {
                const active = history.find(h => !h.outTime && (h.date === dateString || h.date.startsWith(dateString)));
                if (active) targetId = active.id;
            }

            if (targetId) {
                const updatePayload = {
                    id: targetId,
                    outTime: timeString
                };
                
                setStatus('Checked Out');
                setHistory(prev => prev.map(h => 
                    h.id === targetId ? { ...h, outTime: timeString } : h
                ));
                setCurrentSessionId(null);

                const result = await api.update('Attendance', updatePayload);
                console.log('Punch Out Result:', result);
                
                if (result.status !== 'success') {
                  setStatus('Checked In');
                  setCurrentSessionId(targetId);
                  setHistory(prev => prev.map(h => 
                      h.id === targetId ? { ...h, outTime: '' } : h
                  ));
                  setError('Failed to punch out. Please try again.');
                }
            } else {
                 setError("Active session not found. Please refresh.");
                 await loadHistory();
            }
        }
    } catch (err) {
        console.error('Attendance Error:', err);
        setError("Network error. Changes saved locally but sync failed.");
    } finally {
        setLoadingAction(false);
    }
  };

  const handleBreakToggle = async () => {
    if (!location) {
      setError('Please get your location first by clicking the GPS refresh button.');
      return;
    }
    
    setLoadingAction(true);
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    try {
        if (status === 'Checked In') {
            const updatePayload = {
                id: currentSessionId,
                breakInTime: timeString
            };
            
            setStatus('On Break');
            setBreakStatus('Break In');
            
            const result = await api.update('Attendance', updatePayload);
            console.log('Break In Result:', result);
            
        } else if (status === 'On Break') {
            const updatePayload = {
                id: currentSessionId,
                breakOutTime: timeString
            };
            
            setStatus('Checked In');
            setBreakStatus('Break Out');
            
            const result = await api.update('Attendance', updatePayload);
            console.log('Break Out Result:', result);
        }
    } catch (err) {
        console.error('Break Error:', err);
        setError("Network error during break operation.");
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
             <button onClick={getCurrentLocation} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors" title="Get GPS Location">
                <RefreshCw className={`w-4 h-4 text-slate-600 ${loadingAction ? 'animate-spin' : ''}`} />
             </button>
          </div>
          
          <div className="flex justify-center gap-4 py-8">
            <button
            onClick={handleToggle}
            disabled={loadingAction || !location || status === 'On Break'}
            className={`
                relative w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                ${status === 'Checked In' 
                ? 'bg-gradient-to-br from-red-500 to-red-600 ring-8 ring-red-100 shadow-red-200' 
                : 'bg-gradient-to-br from-green-500 to-emerald-600 ring-8 ring-green-100 shadow-green-200'}
            `}
            >
            {loadingAction ? (
                <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin h-8 w-8 text-white mb-2" />
                    <span className="text-white text-xs font-medium">Updating...</span>
                </div>
            ) : (
                <>
                <div className="text-white text-4xl font-black tracking-wider drop-shadow-md">
                    {status === 'Checked In' ? 'OUT' : 'IN'}
                </div>
                <span className="text-white/90 text-xs font-bold uppercase tracking-wider bg-black/10 px-2 py-1 rounded-full">
                    {status === 'Checked In' ? 'Punch Out' : 'Punch In'}
                </span>
                </>
            )}
            </button>

            {(status === 'Checked In' || status === 'On Break') && (
              <button
              onClick={handleBreakToggle}
              disabled={loadingAction || !location}
              className={`
                  relative w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  ${status === 'On Break' 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 ring-8 ring-blue-100 shadow-blue-200' 
                  : 'bg-gradient-to-br from-orange-500 to-orange-600 ring-8 ring-orange-100 shadow-orange-200'}
              `}
              >
              {loadingAction ? (
                  <div className="flex flex-col items-center">
                      <Loader2 className="animate-spin h-8 w-8 text-white mb-2" />
                      <span className="text-white text-xs font-medium">Updating...</span>
                  </div>
              ) : (
                  <>
                  <div className="text-white text-3xl font-black tracking-wider drop-shadow-md">
                      {status === 'On Break' ? 'BACK' : 'BREAK'}
                  </div>
                  <span className="text-white/90 text-xs font-bold uppercase tracking-wider bg-black/10 px-2 py-1 rounded-full">
                      {status === 'On Break' ? 'Break Out' : 'Break In'}
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
                <p className={`text-lg font-bold ${
                    status === 'Checked In' ? 'text-green-600' : 
                    status === 'On Break' ? 'text-orange-600' : 
                    'text-slate-400'
                }`}>
                    {status === 'Checked In' ? 'ONLINE' : 
                     status === 'On Break' ? 'ON BREAK' : 
                     'OFFLINE'}
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
           <button onClick={() => { setError(null); loadHistory(); }} className="text-blue-600 hover:text-blue-700 text-sm font-medium">Manual Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">In</th>
                <th className="px-6 py-3">Out</th>
                <th className="px-6 py-3">Break In</th>
                <th className="px-6 py-3">Break Out</th>
                <th className="px-6 py-3">Hours</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-4">No history found.</td></tr>
              ) : history.slice(0, 10).map((record, idx) => (
                <tr key={record.id || idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{record.date}</td>
                  <td className="px-6 py-4 text-green-600 font-medium">{record.inTime}</td>
                  <td className="px-6 py-4 text-red-600 font-medium">{record.outTime || '--:--'}</td>
                  <td className="px-6 py-4 text-orange-600 font-medium">{record.breakInTime || '--:--'}</td>
                  <td className="px-6 py-4 text-blue-600 font-medium">{record.breakOutTime || '--:--'}</td>
                  <td className="px-6 py-4 text-blue-600 font-medium">{record.totalHours || '--'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Check className="w-3 h-3" /> {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;