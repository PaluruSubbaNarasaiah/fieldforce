import React, { useState, useEffect, useRef } from 'react';
import { MapPin, RefreshCw, User as UserIcon, Radio, Pause, Play, Navigation, Layers, Maximize, Clock } from 'lucide-react';
import { api } from '../services/api';

interface StaffLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'Active' | 'Idle' | 'Offline';
  lastUpdate: string;
  avatar?: string;
  role?: string;
}

const MapTracker: React.FC = () => {
  const [staffLocations, setStaffLocations] = useState<StaffLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [refreshTimer, setRefreshTimer] = useState(15);
  const [intervalSetting, setIntervalSetting] = useState(15);
  const [mapMode, setMapMode] = useState<'relative' | 'geo'>('relative'); // Future proofing

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper for consistent date check
  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initial Load
  useEffect(() => {
    fetchLocations();
  }, []);

  // Polling Logic
  useEffect(() => {
    if (!isAutoRefresh) {
        if (timerRef.current) clearInterval(timerRef.current);
        return;
    }

    timerRef.current = setInterval(() => {
        setRefreshTimer((prev) => {
            if (prev <= 1) {
                fetchLocations();
                return intervalSetting; // Reset to configured interval
            }
            return prev - 1;
        });
    }, 1000);

    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoRefresh, intervalSetting]);

  const handleManualRefresh = () => {
      setLoading(true);
      fetchLocations();
      setRefreshTimer(intervalSetting); // Reset timer to prevent double fetch
  };

  const fetchLocations = async () => {
    // If manually triggered while already loading, don't block but ensure loading state is set
    if (staffLocations.length === 0) setLoading(true);
    
    try {
      const [usersData, attendanceData] = await Promise.all([
        api.fetch('Users'),
        api.fetch('Attendance')
      ]);

      const today = getTodayDateString();
      const todayStr = new Date().toDateString();

      const processedStaff: StaffLocation[] = [];
      const validCoords: {lat: number, lng: number}[] = [];

      if (usersData) {
        usersData.forEach((user: any) => {
            const userRecords = attendanceData
                .filter((a: any) => {
                    if (!a.date) return false;
                    // Robust check: matches local YYYY-MM-DD string OR legacy ISO string
                    const isIsoMatch = a.date.includes(today) || a.date === today;
                    const isDateMatch = new Date(a.date).toDateString() === todayStr;
                    return (isIsoMatch || isDateMatch) && String(a.userId) === String(user.id);
                })
                .sort((a: any, b: any) => Number(b.id) - Number(a.id));

            const latestRecord = userRecords.length > 0 ? userRecords[0] : null;
            
            let status: 'Active' | 'Idle' | 'Offline' = 'Offline';
            let lat = 0;
            let lng = 0;
            let lastUpdate = '';

            if (latestRecord) {
                if (latestRecord.outTime && latestRecord.outTime.length > 0) {
                    status = 'Idle'; 
                    lastUpdate = latestRecord.outTime;
                } else {
                    status = 'Active'; 
                    lastUpdate = latestRecord.inTime;
                }

                if (latestRecord.location) {
                    const parts = latestRecord.location.split(',').map((s: string) => s.trim());
                    if (parts.length === 2) {
                        lat = parseFloat(parts[0]);
                        lng = parseFloat(parts[1]);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            // Add slight jitter for demo "live" feel if coords are exactly same (optional visual polish)
                            // const jitter = (Math.random() - 0.5) * 0.0001;
                            // lat += jitter; 
                            // lng += jitter;
                            validCoords.push({ lat, lng });
                        }
                    }
                }
            }

            processedStaff.push({
                id: user.id,
                name: user.name,
                role: user.role,
                avatar: user.avatar,
                status,
                lat,
                lng,
                lastUpdate: lastUpdate || 'No Activity'
            });
        });
      }

      // Map Normalization
      if (validCoords.length > 0) {
        const lats = validCoords.map(c => c.lat);
        const lngs = validCoords.map(c => c.lng);
        
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        // Add padding (10%)
        const latBuffer = Math.max((maxLat - minLat) * 0.1, 0.002);
        const lngBuffer = Math.max((maxLng - minLng) * 0.1, 0.002);

        const effectiveMinLat = minLat - latBuffer;
        const effectiveMaxLat = maxLat + latBuffer;
        const effectiveMinLng = minLng - lngBuffer;
        const effectiveMaxLng = maxLng + lngBuffer;

        const latRange = effectiveMaxLat - effectiveMinLat;
        const lngRange = effectiveMaxLng - effectiveMinLng;

        const normalizedStaff = processedStaff.map(s => {
            if (s.status === 'Offline' || s.lat === 0) return s;

            let relativeLat = 50;
            let relativeLng = 50;

            if (latRange > 0.0000001) {
                // Latitude: 0% is Top (Max Lat), 100% is Bottom (Min Lat)
                relativeLat = ((effectiveMaxLat - s.lat) / latRange) * 100;
            }
            if (lngRange > 0.0000001) {
                // Longitude: 0% is Left (Min Lng), 100% is Right (Max Lng)
                relativeLng = ((s.lng - effectiveMinLng) / lngRange) * 100;
            }

            return { ...s, lat: relativeLat, lng: relativeLng };
        });
        setStaffLocations(normalizedStaff);
      } else {
        setStaffLocations(processedStaff);
      }

      setLastUpdated(new Date());
      // Don't reset timer here, let the interval handle it or the manual refresh handle it
    } catch (error) {
        console.error("Failed to fetch locations:", error);
    } finally {
        setLoading(false);
    }
  };

  const activeCount = staffLocations.filter(s => s.status === 'Active').length;
  const idleCount = staffLocations.filter(s => s.status === 'Idle').length;

  const getRoleIcon = (role?: string) => {
    const r = role?.toLowerCase() || '';
    if (r.includes('admin')) return <UserIcon className="w-3 h-3 text-white" />; // Generic for now
    if (r.includes('hr')) return <UserIcon className="w-3 h-3 text-white" />;
    return <UserIcon className="w-3 h-3 text-white" />;
  };

  const getRoleColor = (role?: string) => {
    const r = role?.toLowerCase() || '';
    if (r.includes('admin')) return 'bg-purple-600';
    if (r.includes('hr')) return 'bg-blue-600';
    return 'bg-slate-600';
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] animate-fade-in pb-4">
        {/* Sidebar List */}
        <div className="w-full lg:w-80 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800">Field Staff</h3>
                    <div className="flex items-center gap-1">
                        <span className="flex items-center gap-1 text-xs font-medium bg-white border border-slate-200 px-2 py-1 rounded-md shadow-sm">
                           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {activeCount} Online
                        </span>
                    </div>
                </div>
                
                {/* Auto Refresh Control */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 mb-2 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            {isAutoRefresh ? (
                                <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                            ) : (
                                <Pause className="w-4 h-4 text-slate-400" />
                            )}
                            <span>{isAutoRefresh ? `Refreshes in ${refreshTimer}s` : 'Updates Paused'}</span>
                        </div>
                        <button 
                            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                            className={`p-1.5 rounded-md transition-colors ${isAutoRefresh ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            title={isAutoRefresh ? "Pause Updates" : "Resume Updates"}
                        >
                            {isAutoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                        <div className="flex items-center gap-2 text-slate-500">
                             <Clock className="w-3.5 h-3.5" />
                             <span>Interval:</span>
                        </div>
                        <select 
                            value={intervalSetting}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setIntervalSetting(val);
                                setRefreshTimer(val);
                            }}
                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                            <option value={5}>5s (Fast)</option>
                            <option value={10}>10s</option>
                            <option value={15}>15s (Default)</option>
                            <option value={30}>30s</option>
                            <option value={60}>1m (Slow)</option>
                        </select>
                    </div>
                </div>

                <div className="relative mt-2">
                    <input 
                        type="text" 
                        placeholder="Filter staff..." 
                        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all"
                    />
                    <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {staffLocations.map(staff => (
                    <div key={staff.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group">
                        <div className="relative">
                            <img 
                                src={staff.avatar || `https://ui-avatars.com/api/?name=${staff.name}`} 
                                alt={staff.name}
                                className={`w-10 h-10 rounded-full object-cover border-2 ${staff.status === 'Active' ? 'border-green-500' : staff.status === 'Idle' ? 'border-amber-400' : 'border-slate-200 grayscale'}`}
                            />
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${staff.status === 'Active' ? 'bg-green-500' : staff.status === 'Idle' ? 'bg-amber-400' : 'bg-slate-400'}`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <p className="font-semibold text-sm text-slate-800 truncate">{staff.name}</p>
                                <span className="text-[10px] text-slate-400">{staff.lastUpdate}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-white ${getRoleColor(staff.role)}`}>
                                   <span className="capitalize">{staff.role || 'Staff'}</span>
                                </div>
                                {staff.status === 'Active' && <span className="text-green-600 font-medium flex items-center gap-1"><Navigation className="w-3 h-3" /> Live</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200 shadow-inner group">
            {/* Map Grid / Background */}
            <div 
                className="absolute inset-0 opacity-10"
                style={{
                backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
                backgroundSize: '30px 30px'
                }}
            ></div>
            
            {/* Map Stylized Paths (Placeholder) */}
            <svg className="absolute inset-0 w-full h-full text-slate-300 pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
                 <defs>
                    <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <path d="M0,50% Q25%,40% 50%,50% T100%,60%" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="5,5" />
                <path d="M50%,0 Q60%,50% 50%,100%" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="5,5" />
            </svg>

            {/* Controls Overlay */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <button 
                    onClick={handleManualRefresh}
                    className="bg-white p-2.5 rounded-lg shadow-sm text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 transition-all active:scale-95"
                    title="Force Refresh"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button 
                    className="bg-white p-2.5 rounded-lg shadow-sm text-slate-600 hover:text-slate-900 border border-slate-200 transition-all"
                    title="Map Layers"
                >
                    <Layers className="w-5 h-5" />
                </button>
                <button 
                    className="bg-white p-2.5 rounded-lg shadow-sm text-slate-600 hover:text-slate-900 border border-slate-200 transition-all"
                    title="Fullscreen"
                >
                    <Maximize className="w-5 h-5" />
                </button>
            </div>

            {/* Info Badge */}
            <div className="absolute top-4 left-4 z-10">
                <div className="bg-white/95 backdrop-blur px-4 py-2.5 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isAutoRefresh ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                        <span className="text-sm font-bold text-slate-800 tracking-tight">LIVE TRACKING</span>
                    </div>
                    {lastUpdated && <p className="text-[10px] text-slate-400 font-mono">Last synced: {lastUpdated.toLocaleTimeString()}</p>}
                </div>
            </div>

            {/* Pins */}
            {staffLocations.filter(s => s.status !== 'Offline' && s.lat !== 0).map((staff) => (
                <div
                key={staff.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-1000 ease-in-out hover:z-50"
                style={{ top: `${staff.lat}%`, left: `${staff.lng}%` }}
                >
                <div className="relative group/pin flex flex-col items-center">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-3 opacity-0 group-hover/pin:opacity-100 transition-all duration-200 transform translate-y-2 group-hover/pin:translate-y-0 bg-slate-900 text-white text-xs p-2 rounded-lg whitespace-nowrap z-30 pointer-events-none shadow-xl flex flex-col items-center">
                        <div className="font-bold flex items-center gap-1.5">
                            {staff.name}
                            <span className={`w-1.5 h-1.5 rounded-full ${staff.status === 'Active' ? 'bg-green-400' : 'bg-amber-400'}`}></span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{staff.lastUpdate}</div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>

                    <div className="relative">
                        <div className={`
                            w-10 h-10 rounded-full border-[3px] shadow-lg overflow-hidden relative z-20 transition-transform group-hover/pin:scale-110 bg-white
                            ${staff.status === 'Active' ? 'border-green-500' : 'border-amber-400 grayscale'}
                        `}>
                            <img 
                                src={staff.avatar || `https://ui-avatars.com/api/?name=${staff.name}`} 
                                alt={staff.name} 
                                className="w-full h-full object-cover" 
                            />
                        </div>
                        {/* Status Indicator Dot */}
                        <div className={`
                            absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center z-30 shadow-sm
                            ${staff.status === 'Active' ? 'bg-green-500' : 'bg-amber-400'}
                        `}>
                        </div>
                    </div>
                    
                    {/* Ripple Effect */}
                    {staff.status === 'Active' && isAutoRefresh && (
                        <div className="absolute inset-0 rounded-full bg-green-500 -z-10 animate-ping opacity-30 scale-150 duration-1000"></div>
                    )}
                    
                    {/* Pin Stick/Shadow */}
                    <div className="w-0.5 h-3 bg-slate-400/50 -mt-1 rounded-full relative z-0"></div>
                    <div className="w-6 h-1.5 bg-black/10 rounded-[100%] blur-[1px]"></div>
                </div>
                </div>
            ))}

            {activeCount === 0 && idleCount === 0 && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                    <Radio className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="font-medium text-slate-500">No active signals detected.</p>
                    <p className="text-sm mt-1">Staff must punch in to appear on map.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default MapTracker;