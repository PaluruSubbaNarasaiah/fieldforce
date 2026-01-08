import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, MapPin, CheckCircle2, Clock, XCircle, X, Loader2 } from 'lucide-react';
import { VisitStatus, Visit } from '../types';
import { api } from '../services/api';

const Visits: React.FC = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [newVisit, setNewVisit] = useState({
    customerName: '',
    address: '',
    date: '',
    time: '',
    assignedTo: 'John Doe'
  });

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    setLoading(true);
    const data = await api.fetch('Visits');
    setVisits(data);
    setLoading(false);
  };

  const getStatusColor = (status: VisitStatus | string) => {
    switch(status) {
      case VisitStatus.COMPLETED: return 'bg-green-100 text-green-700 border-green-200';
      case VisitStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700 border-blue-200';
      case VisitStatus.SCHEDULED: return 'bg-slate-100 text-slate-700 border-slate-200';
      case VisitStatus.CANCELLED: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: VisitStatus | string) => {
    switch(status) {
      case VisitStatus.COMPLETED: return <CheckCircle2 className="w-4 h-4" />;
      case VisitStatus.IN_PROGRESS: return <Clock className="w-4 h-4" />;
      case VisitStatus.CANCELLED: return <XCircle className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const visit: Visit = {
      id: Date.now().toString(),
      customerName: newVisit.customerName,
      address: newVisit.address,
      date: `${newVisit.date} ${newVisit.time}`,
      status: VisitStatus.SCHEDULED,
      assignedTo: newVisit.assignedTo
    };
    
    // Optimistic Update
    setVisits([visit, ...visits]);
    setShowModal(false);
    setNewVisit({ customerName: '', address: '', date: '', time: '', assignedTo: 'John Doe' });
    
    await api.create('Visits', visit);
    loadVisits();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Visits</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>New Visit</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search customer, address..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {['All', 'Scheduled', 'In Progress', 'Completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${
                filter === f 
                ? 'bg-slate-800 text-white border-slate-800' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
             <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {visits.filter(v => filter === 'All' || v.status === filter).length === 0 ? (
             <div className="text-center py-10 text-slate-500">No visits found.</div>
          ) : visits.filter(v => filter === 'All' || v.status === filter).map((visit) => (
            <div key={visit.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg text-slate-800">{visit.customerName}</h3>
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(visit.status)}`}>
                      {getStatusIcon(visit.status)}
                      {visit.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {visit.address}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {visit.date}
                    </div>
                  </div>

                  {visit.notes && (
                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 border border-slate-100 mt-2">
                      <span className="font-semibold text-slate-700">Note:</span> {visit.notes}
                    </div>
                  )}
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                       {(visit.assignedTo || 'User').split(' ').map(n=>n[0]).join('')}
                     </div>
                     <span className="text-sm font-medium text-slate-700 md:hidden lg:block">{visit.assignedTo}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50 transition-colors">
                      Reschedule
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Schedule New Visit</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newVisit.customerName} onChange={e => setNewVisit({...newVisit, customerName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newVisit.address} onChange={e => setNewVisit({...newVisit, address: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input required type="date" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newVisit.date} onChange={e => setNewVisit({...newVisit, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input required type="time" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newVisit.time} onChange={e => setNewVisit({...newVisit, time: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" value={newVisit.assignedTo} onChange={e => setNewVisit({...newVisit, assignedTo: e.target.value})}>
                  <option>John Doe</option>
                  <option>Sarah Smith</option>
                  <option>Mike Ross</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">Schedule Visit</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visits;