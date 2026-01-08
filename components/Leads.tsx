import React, { useState, useEffect } from 'react';
import { Mail, Phone, MoreHorizontal, Sparkles, Building, ChevronRight, Plus, X, Loader2, Info } from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { analyzeLead } from '../services/geminiService';
import { api } from '../services/api';

const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, { score: number; justification: string; confidence: string }>>({});
  const [showModal, setShowModal] = useState(false);
  const [newLead, setNewLead] = useState({
    company: '',
    contactPerson: '',
    email: '',
    phone: '',
    potentialValue: 0
  });

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    const data = await api.fetch('Leads');
    setLeads(data);
    setLoading(false);
  };

  const handleAiAnalysis = async (lead: Lead) => {
    if (aiAnalysis[lead.id]) return; 
    
    setAnalyzingId(lead.id);
    const result = await analyzeLead(lead);
    setAiAnalysis(prev => ({ ...prev, [lead.id]: result }));
    setAnalyzingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const lead: Lead = {
      id: Date.now().toString(),
      company: newLead.company,
      contactPerson: newLead.contactPerson,
      email: newLead.email,
      phone: newLead.phone,
      status: LeadStatus.NEW,
      potentialValue: newLead.potentialValue
    };
    
    setLeads([lead, ...leads]);
    setShowModal(false);
    setNewLead({ company: '', contactPerson: '', email: '', phone: '', potentialValue: 0 });
    
    await api.create('Leads', lead);
    loadLeads();
  };

  const handleContact = (type: 'email' | 'phone', value: string) => {
    window.open(`${type === 'email' ? 'mailto:' : 'tel:'}${value}`, '_blank');
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Lead Management</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
             <div className="flex justify-center py-10">
                 <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
             </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Company / Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Value</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">AI Score</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6 text-slate-500">No leads found.</td></tr>
              ) : leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{lead.company}</p>
                        <p className="text-xs text-slate-500">{lead.contactPerson}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      px-2.5 py-1 rounded-full text-xs font-medium
                      ${lead.status === LeadStatus.NEW ? 'bg-blue-100 text-blue-700' : 
                        lead.status === LeadStatus.QUALIFIED ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-700'}
                    `}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(lead.potentialValue)}
                  </td>
                  <td className="px-6 py-4">
                    {aiAnalysis[lead.id] ? (
                      <div className="group/tooltip relative">
                         <div className="flex items-center gap-2 cursor-help">
                            <div className={`
                              w-12 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white
                              ${aiAnalysis[lead.id].score >= 80 ? 'bg-green-500' : aiAnalysis[lead.id].score >= 50 ? 'bg-orange-500' : 'bg-red-500'}
                            `}>
                              {aiAnalysis[lead.id].score}
                            </div>
                            <div className={`
                                w-2 h-2 rounded-full ring-2 ring-white
                                ${aiAnalysis[lead.id].confidence === 'High' ? 'bg-blue-500' : aiAnalysis[lead.id].confidence === 'Medium' ? 'bg-yellow-400' : 'bg-slate-300'}
                            `}></div>
                         </div>
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-20">
                            <div className="flex justify-between items-center mb-1 border-b border-slate-700 pb-1">
                                <span className="font-bold text-slate-300 flex items-center gap-1"><Sparkles className="w-3 h-3 text-indigo-400"/> AI Insight</span>
                                <span className={`text-[10px] px-1.5 rounded ${aiAnalysis[lead.id].confidence === 'High' ? 'bg-blue-900 text-blue-200' : 'bg-slate-700 text-slate-300'}`}>
                                    {aiAnalysis[lead.id].confidence} Conf.
                                </span>
                            </div>
                            <p className="leading-relaxed">{aiAnalysis[lead.id].justification}</p>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                         </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleAiAnalysis(lead)}
                        disabled={analyzingId === lead.id}
                        className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800 disabled:opacity-50"
                      >
                        <Sparkles className={`w-3 h-3 ${analyzingId === lead.id ? 'animate-spin' : ''}`} /> 
                        {analyzingId === lead.id ? 'Analyzing...' : 'Get Score'}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => handleContact('phone', lead.phone)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                          <Phone className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleContact('email', lead.email)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                          <Mail className="w-4 h-4" />
                       </button>
                       <button className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Add New Lead</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newLead.contactPerson} onChange={e => setNewLead({...newLead, contactPerson: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input required type="email" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newLead.email} onChange={e => setNewLead({...newLead, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input required type="tel" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newLead.phone} onChange={e => setNewLead({...newLead, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Potential Value (₹)</label>
                <input required type="number" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newLead.potentialValue} onChange={e => setNewLead({...newLead, potentialValue: parseInt(e.target.value)})} />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">Create Lead</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;