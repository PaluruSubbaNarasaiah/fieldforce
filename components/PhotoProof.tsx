import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, RefreshCw, Upload, Wifi, WifiOff, CheckCircle2, AlertTriangle, Compass, Cloud, Loader2, Focus, Settings, Activity } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface PhotoProofProps {
  user: User;
}

const PhotoProof: React.FC<PhotoProofProps> = ({ user }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [geoData, setGeoData] = useState<GeolocationCoordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [address, setAddress] = useState<string>('Fetching location...');
  const [weather, setWeather] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [campaign, setCampaign] = useState('General');
  const [compass, setCompass] = useState<number>(0);
  const [pendingUploads, setPendingUploads] = useState<any[]>([]);
  const [flash, setFlash] = useState(false);
  
  // Stabilization States
  const [stability, setStability] = useState<number>(0);
  const [stabilizing, setStabilizing] = useState(false);
  const stabilityRef = useRef<number>(0);

  // 1. Initialize Camera
  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 2. Watch Location, Orientation & Motion (Stabilization)
  useEffect(() => {
    if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported by your browser.");
        return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoData(pos.coords);
        setLocationError(null); // Clear error on success
        fetchAddress(pos.coords.latitude, pos.coords.longitude);
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.error(err);
        let msg = "GPS Signal Lost";
        if (err.code === 1) msg = "Location Access Denied. Please enable permissions.";
        else if (err.code === 2) msg = "GPS Unavailable. Check device settings.";
        else if (err.code === 3) msg = "GPS Timeout. Searching...";
        setLocationError(msg);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    // Device Orientation for Compass
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha) setCompass(Math.round(event.alpha));
    };

    // Device Motion for Stabilization
    const handleMotion = (event: DeviceMotionEvent) => {
        const r = event.rotationRate;
        if (r) {
            // Calculate aggregate rotational movement magnitude (shake)
            const magnitude = Math.sqrt(
                (r.alpha || 0) ** 2 + 
                (r.beta || 0) ** 2 + 
                (r.gamma || 0) ** 2
            );
            // Exponential Smoothing
            const current = stabilityRef.current * 0.85 + magnitude * 0.15;
            stabilityRef.current = current;
            setStability(current);
        }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, []);

  // Load pending uploads from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pendingPhotoUploads');
    if (saved) {
        setPendingUploads(JSON.parse(saved));
    }
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("Camera access is required for this feature. Please enable camera permissions.");
    }
  };

  const playShutterSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
        console.error("Audio play failed", e);
    }
  };

  const fetchAddress = async (lat: number, lng: number) => {
    try {
        // Simple reverse geocoding via OpenStreetMap (Free, requires attribution)
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data && data.display_name) {
            setAddress(data.display_name);
        }
    } catch (e) {
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  const fetchWeather = async (lat: number, lng: number) => {
      if (weather) return; // Don't spam
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
        const data = await res.json();
        if (data.current_weather) {
            setWeather(`${data.current_weather.temperature}°C`);
        }
      } catch (e) {
        // ignore
      }
  };

  const capturePhoto = (force = false) => {
    if (!videoRef.current || !canvasRef.current || !geoData) {
        alert("Waiting for GPS lock... Ensure your device location is enabled.");
        return;
    }

    // Smart Stabilization Logic
    // If not forced and shaking (stability > 2.5 degrees/sec roughly), wait
    if (!force && stabilityRef.current > 2.5) {
        setStabilizing(true);
        const startTime = Date.now();
        
        const checkStability = setInterval(() => {
            // Capture if stable OR if timeout (2s) reached to prevent freezing
            if (stabilityRef.current < 1.5 || Date.now() - startTime > 2000) {
                clearInterval(checkStability);
                setStabilizing(false);
                performCapture();
            }
        }, 100);
        return;
    }

    performCapture();
  };

  const performCapture = () => {
    // Feedback
    playShutterSound();
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const video = videoRef.current;
    if (!video) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 1. Draw Video Frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 2. Draw Data Stamp Overlay (Bottom 35-40%)
    // Use a gradient for better readability of white text over any background
    const gradientHeight = canvas.height * 0.4;
    const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.3, 'rgba(0,0,0,0.6)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

    // Layout configuration
    const margin = canvas.width * 0.04;
    const bottomY = canvas.height - margin;
    
    ctx.fillStyle = 'white';
    ctx.textBaseline = 'bottom';
    // Add text shadow for clarity
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    
    // Map Placeholder (Right Side)
    const mapSize = canvas.width * 0.25;
    const mapX = canvas.width - margin - mapSize;
    const mapY = bottomY - mapSize;
    
    // Draw Map Background Box
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    
    // Draw Map Border
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);
    
    // Draw Stylized Map Grid Lines
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    // Vertical lines
    ctx.moveTo(mapX + mapSize * 0.33, mapY);
    ctx.lineTo(mapX + mapSize * 0.33, mapY + mapSize);
    ctx.moveTo(mapX + mapSize * 0.66, mapY);
    ctx.lineTo(mapX + mapSize * 0.66, mapY + mapSize);
    // Horizontal lines
    ctx.moveTo(mapX, mapY + mapSize * 0.33);
    ctx.lineTo(mapX + mapSize, mapY + mapSize * 0.33);
    ctx.moveTo(mapX, mapY + mapSize * 0.66);
    ctx.lineTo(mapX + mapSize, mapY + mapSize * 0.66);
    ctx.stroke();
    
    // Draw Map Pin
    ctx.fillStyle = '#ef4444'; // Red
    ctx.beginPath();
    ctx.arc(mapX + mapSize/2, mapY + mapSize/2, mapSize * 0.08, 0, Math.PI * 2);
    ctx.fill();
    
    // Map Label
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    const mapFontSize = Math.floor(mapSize * 0.15);
    ctx.font = `bold ${mapFontSize}px sans-serif`;
    ctx.fillText("GPS MAP", mapX + mapSize/2, mapY + mapSize - (mapFontSize/2));
    ctx.textAlign = 'left'; // Reset

    // Text Data (Left Side)
    const textMaxWidth = mapX - margin - (margin/2);
    const baseFontSize = Math.floor(canvas.width * 0.035);
    const lineHeight = baseFontSize * 1.5;
    
    // Position text upwards from bottom aligned with map
    let currentY = bottomY;

    // Row 4: Extra Stats (Alt, Acc, Weather)
    ctx.font = `${baseFontSize * 0.8}px monospace`;
    ctx.fillStyle = '#e2e8f0'; // Slight grey for secondary info
    
    const acc = `Acc: ±${Math.round(geoData?.accuracy || 0)}m`;
    const alt = geoData?.altitude ? `Alt: ${Math.round(geoData.altitude)}m` : '';
    const dir = `Dir: ${compass}° ${getCompassDirection(compass)}`;
    const wx = weather ? `Tmp: ${weather}` : '';
    const extras = [alt, acc, dir, wx].filter(Boolean).join(' | ');
    
    ctx.fillText(extras, margin, currentY);
    currentY -= lineHeight;

    // Row 3: Date & Time
    ctx.font = `${baseFontSize}px monospace`;
    ctx.fillStyle = 'white';
    ctx.fillText(new Date().toLocaleString(), margin, currentY);
    currentY -= lineHeight;

    // Row 2: Coordinates
    ctx.font = `${baseFontSize}px monospace`;
    ctx.fillText(`Lat : ${geoData?.latitude.toFixed(6)}`, margin, currentY);
    currentY -= lineHeight;
    ctx.fillText(`Lng : ${geoData?.longitude.toFixed(6)}`, margin, currentY);
    currentY -= lineHeight * 1.2;

    // Row 1: Address (Prominent)
    ctx.font = `bold ${baseFontSize * 1.1}px sans-serif`;
    // Word wrap the address if it's too long
    const addressWords = address.split(' ');
    let line = '';
    const addressLines = [];
    
    for (let n = 0; n < addressWords.length; n++) {
        const testLine = line + addressWords[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > textMaxWidth && n > 0) {
            addressLines.push(line);
            line = addressWords[n] + ' ';
        } else {
            line = testLine;
        }
    }
    addressLines.push(line);

    // Draw address lines upwards
    for (let i = addressLines.length - 1; i >= 0; i--) {
        // Limit to 2 lines max to prevent overflow
        if (addressLines.length - i <= 2) {
             ctx.fillText(addressLines[i], margin, currentY);
             currentY -= lineHeight * 1.1;
        }
    }
    
    // Verified Badge at the very top of the overlay area
    const badgeSize = baseFontSize * 0.8;
    ctx.fillStyle = '#22c55e'; // Green
    ctx.fillText("✓ GPS VERIFIED", margin, currentY);

    // Save final image
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
  };

  const getCompassDirection = (degree: number) => {
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const index = Math.round(((degree %= 360) < 0 ? degree + 360 : degree) / 45) % 8;
      return directions[index];
  };

  const handleUpload = async () => {
    if (!capturedImage || !geoData) return;
    setUploading(true);

    const payload = {
        imageData: capturedImage,
        metadata: {
            executiveId: user.id,
            executiveName: user.name,
            timestamp: new Date().toISOString(),
            latitude: geoData.latitude,
            longitude: geoData.longitude,
            address: address,
            campaign: campaign,
            notes: notes
        }
    };

    try {
        console.log("Uploading photo with payload:", payload);
        // Try online upload
        const res = await api.uploadPhoto(payload.imageData, payload.metadata);
        console.log("Upload Response:", res);

        if (res.status === 'success') {
            alert("Photo Uploaded Successfully!");
            setCapturedImage(null);
            setNotes('');
        } else {
            // Handle error message properly to avoid [object Object]
            let errorMsg = "Server responded with error";
            if (res.message) {
                if (typeof res.message === 'string') {
                    errorMsg = res.message;
                } else {
                    try {
                        errorMsg = JSON.stringify(res.message);
                    } catch {
                        errorMsg = "Unknown Error Object";
                    }
                }
            }
            throw new Error(errorMsg);
        }
    } catch (e: any) {
        console.error("Upload Exception:", e);
        let msg = "Unknown error";
        
        // Robust Error parsing
        if (typeof e === 'string') {
            msg = e;
        } else if (e instanceof Error) {
            msg = e.message;
        } else if (e && typeof e === 'object') {
             // Handle raw objects (including backend JSON responses parsed as errors)
             msg = e.message || e.error || JSON.stringify(e);
        }
        
        // Final sanity check to avoid [object Object] alert
        if (typeof msg !== 'string') {
            try {
                msg = JSON.stringify(msg);
            } catch {
                msg = "An unspecified error occurred";
            }
        }
        
        if (msg === '{}' || msg === '[]') msg = "An unspecified error occurred (Empty Response)";
        
        // Specific check for string "[object Object]" which can happen if explicit string casting occurred on an object elsewhere
        if (msg.includes("[object Object]")) {
            console.warn("Caught [object Object] string error", e);
            msg = "An unexpected error occurred during upload. Please try again.";
        }

        if (confirm(`Upload failed: ${msg}. Save to offline queue?`)) {
            const newQueue = [...pendingUploads, { ...payload, id: Date.now() }];
            setPendingUploads(newQueue);
            localStorage.setItem('pendingPhotoUploads', JSON.stringify(newQueue));
            setCapturedImage(null);
        }
    } finally {
        setUploading(false);
    }
  };

  const syncOffline = async () => {
    if (pendingUploads.length === 0) return;
    setUploading(true);
    let successCount = 0;
    const remaining = [...pendingUploads];

    for (const item of pendingUploads) {
        try {
            const res = await api.uploadPhoto(item.imageData, item.metadata);
            if (res.status === 'success') {
                successCount++;
                const index = remaining.findIndex(i => i.id === item.id);
                if (index > -1) remaining.splice(index, 1);
            }
        } catch (e) {
            console.error("Sync failed for item", item.id);
        }
    }

    setPendingUploads(remaining);
    localStorage.setItem('pendingPhotoUploads', JSON.stringify(remaining));
    setUploading(false);
    alert(`Synced ${successCount} photos.`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">GPS Photo Proof</h2>
          <p className="text-slate-500 text-sm">Capture verified field evidence.</p>
        </div>
        <div className="flex items-center gap-2">
            {pendingUploads.length > 0 && (
                <button 
                  onClick={syncOffline}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-200"
                >
                   <RefreshCw className={`w-4 h-4 ${uploading ? 'animate-spin' : ''}`} />
                   Sync ({pendingUploads.length})
                </button>
            )}
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${geoData ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 animate-pulse'}`}>
                {geoData ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {geoData ? 'GPS Locked' : 'No GPS Signal'}
            </div>
        </div>
      </div>

      <div className="bg-black rounded-xl overflow-hidden shadow-2xl relative aspect-[3/4] sm:aspect-video group">
        {/* Flash Overlay */}
        <div 
            className={`absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200 ease-out ${flash ? 'opacity-100' : 'opacity-0'}`}
        />

        {!capturedImage ? (
            <>
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                />
                
                {/* Advanced Reticle Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Stability Indicator in Reticle */}
                     <div className={`
                         absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold transition-all
                         ${stabilizing ? 'bg-blue-500 text-white animate-pulse' : stability > 2.5 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}
                         ${stability > 0.1 ? 'opacity-100' : 'opacity-0'}
                     `}>
                         {stabilizing ? 'STABILIZING...' : stability > 2.5 ? 'SHAKY' : 'STABLE'}
                     </div>

                    {/* Outer Box */}
                    <div className={`
                        relative w-64 h-64 border border-opacity-30 transition-colors duration-500
                        ${geoData ? 'border-green-500/30' : 'border-white/30'}
                    `}>
                        {/* Stability Level Bar (Vertical on side) */}
                         <div className="absolute top-0 -right-4 w-1.5 h-full bg-black/50 rounded-full overflow-hidden">
                             <div 
                                className={`w-full transition-all duration-200 ${stability > 2.5 ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ height: `${Math.min((stability / 5) * 100, 100)}%`, marginTop: 'auto' }}
                             ></div>
                         </div>

                        {/* Corner Brackets */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white shadow-sm"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white shadow-sm"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white shadow-sm"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white shadow-sm"></div>
                        
                        {/* Center Crosshair */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                           <div className={`w-2 h-2 rounded-full shadow-lg transition-colors ${stability < 1.5 ? 'bg-green-400' : 'bg-white/80'}`}></div>
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white/50 rounded-full"></div>
                        </div>

                        {/* Status Label (in reticle) */}
                         <div className={`
                             absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest transition-colors
                             ${geoData ? 'bg-green-500 text-black' : 'bg-red-500 text-white animate-pulse'}
                         `}>
                             {geoData ? 'LOCKED' : 'NO GPS'}
                         </div>
                    </div>
                </div>

                {/* HUD Info */}
                <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                         <div className="bg-black/50 text-white px-3 py-1 rounded backdrop-blur-sm text-xs border border-white/20">
                            <p className="font-mono font-bold text-green-400 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> LIVE REC
                            </p>
                         </div>
                         <div className="flex flex-col gap-1 items-end">
                             <div className="bg-black/50 text-white px-3 py-1 rounded backdrop-blur-sm text-xs flex items-center gap-2 border border-white/20">
                                <Activity className="w-3 h-3"/> <span>{stability.toFixed(1)} shake</span>
                             </div>
                             <div className="bg-black/50 text-white px-3 py-1 rounded backdrop-blur-sm text-xs flex items-center gap-2 border border-white/20">
                                <Compass className="w-3 h-3"/> <span>{compass}° {getCompassDirection(compass)}</span>
                             </div>
                             {weather && (
                                 <div className="bg-black/50 text-white px-3 py-1 rounded backdrop-blur-sm text-xs flex items-center gap-2 border border-white/20">
                                    <Cloud className="w-3 h-3"/> <span>{weather}</span>
                                 </div>
                             )}
                         </div>
                    </div>

                    <div className="space-y-2 mb-20">
                         {/* Location Error Overlay */}
                         {locationError && (
                            <div className="bg-red-500/90 text-white p-3 rounded backdrop-blur-md text-sm border-l-4 border-white animate-pulse flex items-center gap-3 shadow-lg max-w-[90%] mx-auto mb-4">
                                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                                <div>
                                    <p className="font-bold">GPS Signal Required</p>
                                    <p className="text-xs text-red-50">{locationError}</p>
                                    <button 
                                        onClick={() => navigator.geolocation.getCurrentPosition(() => {}, () => {})} 
                                        className="mt-2 text-xs bg-white text-red-600 px-2 py-1 rounded font-bold uppercase tracking-wide"
                                    >
                                        Enable GPS
                                    </button>
                                </div>
                            </div>
                         )}
                         
                         {/* Live Data Preview Overlay */}
                         {geoData && (
                            <div className="bg-black/40 text-white p-2 rounded backdrop-blur-sm text-[10px] border-l-2 border-green-500 max-w-[60%]">
                                <p className="font-bold truncate">{address}</p>
                                <div className="flex gap-2 mt-0.5 text-slate-300 font-mono">
                                    <span>Lat: {geoData.latitude.toFixed(4)}</span>
                                    <span>Lng: {geoData.longitude.toFixed(4)}</span>
                                </div>
                            </div>
                         )}
                    </div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-6 z-10 pointer-events-auto">
                     <button 
                       onClick={() => capturePhoto()}
                       disabled={!geoData || stabilizing}
                       className={`
                         group relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-transform active:scale-95
                         ${geoData ? 'cursor-pointer' : 'cursor-not-allowed grayscale'}
                         ${stabilizing ? 'scale-90 border-blue-400' : 'hover:scale-105'}
                       `}
                     >
                        <div className={`absolute inset-0 rounded-full border-2 border-black/20`}></div>
                        <div className={`
                            w-16 h-16 rounded-full transition-all duration-300
                            ${stabilizing ? 'bg-blue-500 animate-pulse' : geoData ? 'bg-red-600' : 'bg-slate-500'}
                        `}></div>
                        <Camera className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                     </button>
                </div>
            </>
        ) : (
            <div className="relative h-full">
                <img src={capturedImage} alt="Captured" className="w-full h-full object-contain bg-black" />
                <div className="absolute bottom-0 left-0 right-0 bg-white p-4 space-y-4 rounded-t-xl sm:rounded-none z-20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Campaign Name</label>
                            <select 
                                className="w-full border rounded p-2 text-sm"
                                value={campaign}
                                onChange={(e) => setCampaign(e.target.value)}
                            >
                                <option>General Visit</option>
                                <option>Summer Promo</option>
                                <option>Site Audit</option>
                                <option>Competitor Check</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                             <input 
                               type="text" 
                               className="w-full border rounded p-2 text-sm" 
                               placeholder="Add brief note..."
                               value={notes}
                               onChange={(e) => setNotes(e.target.value)}
                             />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setCapturedImage(null)}
                            className="flex-1 py-3 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                        >
                            Retake
                        </button>
                        <button 
                            onClick={handleUpload}
                            disabled={uploading}
                            className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            Upload Proof
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
      
      {/* Hidden Canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 text-sm text-blue-800 border border-blue-100">
         <AlertTriangle className="w-5 h-5 flex-shrink-0 text-blue-600" />
         <div>
            <p className="font-semibold">Anti-Fraud Enabled & Smart Stabilization</p>
            <p className="text-xs text-blue-700 mt-1">
               Photos are locked to real-time GPS and orientation data. The camera waits for stability to ensure legible proofs.
            </p>
         </div>
      </div>
    </div>
  );
};

export default PhotoProof;