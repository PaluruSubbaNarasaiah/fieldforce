import React, { useState, useEffect } from 'react';
import { PhotoLog } from '../types';
import { api } from '../services/api';
import { Search, Filter, Calendar, MapPin, Download, ExternalLink, Loader2, Image as ImageIcon, X, User, Clock, Info } from 'lucide-react';

const PhotoGallery: React.FC = () => {
  const [photos, setPhotos] = useState<PhotoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterExec, setFilterExec] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoLog | null>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    setLoading(true);
    const data = await api.fetch('Photos');
    // Sort by timestamp desc
    const sorted = data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setPhotos(sorted);
    setLoading(false);
  };

  const filteredPhotos = photos.filter(p => {
    const matchDate = filterDate ? p.timestamp.includes(filterDate) : true;
    const matchExec = filterExec ? p.executiveName.toLowerCase().includes(filterExec.toLowerCase()) : true;
    return matchDate && matchExec;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <h2 className="text-2xl font-bold text-slate-900">Proof Gallery</h2>
            <p className="text-slate-500">Review GPS-stamped field photos.</p>
         </div>
         <div className="flex gap-2">
            <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50">
                <Download className="w-4 h-4" /> Export Report
            </button>
         </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
         <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Search executive name..." 
               className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
               value={filterExec}
               onChange={e => setFilterExec(e.target.value)}
             />
         </div>
         <div className="relative w-full sm:w-48">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
             <input 
               type="date" 
               className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
               value={filterDate}
               onChange={e => setFilterDate(e.target.value)}
             />
         </div>
      </div>

      {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPhotos.length === 0 ? (
                <div className="col-span-full text-center py-10 text-slate-500">No photos found matching criteria.</div>
            ) : filteredPhotos.map(photo => (
                <div key={photo.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition-shadow">
                    <div 
                        className="aspect-video bg-slate-100 relative overflow-hidden cursor-pointer" 
                        onClick={() => setSelectedPhoto(photo)}
                    >
                        <img 
                          src={photo.photoUrl} 
                          alt="Proof" 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Load+Error'; }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                             <ExternalLink className="w-8 h-8 text-white drop-shadow-md" />
                        </div>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-slate-900 text-sm">{photo.executiveName}</p>
                                <p className="text-xs text-slate-500">{new Date(photo.timestamp).toLocaleString()}</p>
                            </div>
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{photo.campaign}</span>
                        </div>
                        
                        <div className="text-xs text-slate-600 flex gap-2 items-start">
                            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                            <span className="line-clamp-2">{photo.address || `${photo.latitude}, ${photo.longitude}`}</span>
                        </div>

                        {photo.notes && (
                            <div className="text-xs bg-slate-50 p-2 rounded text-slate-600 italic">
                                "{photo.notes}"
                            </div>
                        )}
                        
                        <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                             <button 
                               onClick={() => setSelectedPhoto(photo)}
                               className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                             >
                                <ImageIcon className="w-3 h-3" /> View Full
                             </button>
                             {photo.driveFileId && (
                                 <span className="text-[10px] text-slate-400 font-mono">ID: {photo.driveFileId.slice(-6)}</span>
                             )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Modal Preview */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white rounded-2xl overflow-hidden max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row shadow-2xl relative">
                  <button 
                    onClick={() => setSelectedPhoto(null)}
                    className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex-1 bg-black flex items-center justify-center p-4">
                      <img 
                        src={selectedPhoto.photoUrl} 
                        alt="Full Preview" 
                        className="max-h-full max-w-full object-contain"
                      />
                  </div>

                  <div className="w-full md:w-96 bg-white p-6 overflow-y-auto flex flex-col gap-6 border-l border-slate-100">
                      <div>
                          <h3 className="text-xl font-bold text-slate-900 mb-1">Proof Details</h3>
                          <p className="text-sm text-slate-500">Verified GPS Evidence</p>
                      </div>

                      <div className="space-y-4">
                          <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                  <User className="w-5 h-5" />
                              </div>
                              <div>
                                  <p className="text-xs text-slate-500 uppercase font-semibold">Executive</p>
                                  <p className="text-slate-900 font-medium">{selectedPhoto.executiveName}</p>
                                  <p className="text-xs text-slate-400">ID: {selectedPhoto.executiveId}</p>
                              </div>
                          </div>

                          <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                  <Clock className="w-5 h-5" />
                              </div>
                              <div>
                                  <p className="text-xs text-slate-500 uppercase font-semibold">Timestamp</p>
                                  <p className="text-slate-900 font-medium">{new Date(selectedPhoto.timestamp).toLocaleString()}</p>
                              </div>
                          </div>

                          <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                  <Info className="w-5 h-5" />
                              </div>
                              <div>
                                  <p className="text-xs text-slate-500 uppercase font-semibold">Campaign</p>
                                  <span className="inline-block mt-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                      {selectedPhoto.campaign}
                                  </span>
                              </div>
                          </div>

                          <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                                  <MapPin className="w-5 h-5" />
                              </div>
                              <div>
                                  <p className="text-xs text-slate-500 uppercase font-semibold">Location</p>
                                  <p className="text-slate-900 text-sm mt-0.5">{selectedPhoto.address}</p>
                                  <div className="flex gap-2 mt-2 text-xs font-mono bg-slate-100 p-2 rounded text-slate-600">
                                      <span>Lat: {Number(selectedPhoto.latitude).toFixed(6)}</span>
                                      <span>Lng: {Number(selectedPhoto.longitude).toFixed(6)}</span>
                                  </div>
                              </div>
                          </div>
                          
                          {selectedPhoto.notes && (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Notes</p>
                                <p className="text-slate-700 text-sm italic">"{selectedPhoto.notes}"</p>
                            </div>
                          )}
                      </div>

                      <div className="mt-auto pt-6 border-t border-slate-100 flex gap-2">
                           <a 
                             href={selectedPhoto.photoUrl} 
                             target="_blank" 
                             rel="noreferrer"
                             className="flex-1 bg-blue-600 text-white text-center py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                           >
                              <ExternalLink className="w-4 h-4" /> Open Original
                           </a>
                      </div>
                  </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;