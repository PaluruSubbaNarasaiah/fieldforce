import React, { useState, useEffect } from 'react';
import { IndianRupee, Plus, Check, X, Filter, Loader2 } from 'lucide-react';
import { Expense, User, UserRole } from '../types';
import { api } from '../services/api';

interface ExpensesProps {
  user: User;
}

const Expenses: React.FC<ExpensesProps> = ({ user }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: 'Travel', amount: 0, description: '' });

  const canApprove = user.role === UserRole.ADMIN || user.role === UserRole.HR;

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    const data = await api.fetch('Expenses');
    setExpenses(data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const expense: Expense = {
      id: Date.now().toString(),
      category: newExpense.category,
      amount: newExpense.amount,
      description: newExpense.description,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending'
    };
    setExpenses([expense, ...expenses]);
    setShowModal(false);
    setNewExpense({ category: 'Travel', amount: 0, description: '' });

    await api.create('Expenses', expense);
    loadExpenses();
  };

  const updateStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    setExpenses(expenses.map(e => e.id === id ? { ...e, status } : e));
    await api.update('Expenses', { id, status });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Expense Claims</h2>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm">
          <Plus className="w-4 h-4" /> New Claim
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
             <div className="flex justify-center py-10">
                 <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
             </div>
        ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-500">Date</th>
                  <th className="px-6 py-4 font-semibold text-slate-500">Category</th>
                  <th className="px-6 py-4 font-semibold text-slate-500">Description</th>
                  <th className="px-6 py-4 font-semibold text-slate-500">Amount</th>
                  <th className="px-6 py-4 font-semibold text-slate-500">Status</th>
                  {canApprove && <th className="px-6 py-4 font-semibold text-slate-500 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-6 text-slate-500">No expenses found.</td></tr>
                ) : expenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-600">{expense.date}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">{expense.category}</span></td>
                    <td className="px-6 py-4 text-slate-800">{expense.description}</td>
                    <td className="px-6 py-4 font-medium">₹{expense.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        expense.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        expense.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{expense.status}</span>
                    </td>
                    {canApprove && (
                      <td className="px-6 py-4 text-right">
                        {expense.status === 'Pending' && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => updateStatus(expense.id, 'Approved')} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                            <button onClick={() => updateStatus(expense.id, 'Rejected')} className="p-1 text-red-600 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Submit Expense Claim</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm mb-1">Category</label>
                <select className="w-full border rounded px-3 py-2" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                  <option>Travel</option><option>Food</option><option>Accommodation</option><option>Misc</option>
                </select>
              </div>
              <div><label className="block text-sm mb-1">Amount</label><input required type="number" className="w-full border rounded px-3 py-2" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: parseInt(e.target.value)})} /></div>
              <div><label className="block text-sm mb-1">Description</label><input required className="w-full border rounded px-3 py-2" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} /></div>
              <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Submit Claim</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Expenses;