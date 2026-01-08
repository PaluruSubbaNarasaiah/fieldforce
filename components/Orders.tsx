import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Search, Filter, X, Loader2 } from 'lucide-react';
import { Order } from '../types';
import { api } from '../services/api';

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newOrder, setNewOrder] = useState({ customer: '', items: '', total: 0 });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    const data = await api.fetch('Orders');
    // Ensure items is an array if coming from string in sheets
    const processed = data.map((o: any) => ({
        ...o,
        items: Array.isArray(o.items) ? o.items : (o.items || '').split(',')
    }));
    setOrders(processed);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const orderItems = newOrder.items.split(',').map(i => i.trim());
    const order: Order = {
      id: Date.now().toString(),
      customer: newOrder.customer,
      items: orderItems,
      total: newOrder.total,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending'
    };

    setOrders([order, ...orders]);
    setShowModal(false);
    setNewOrder({ customer: '', items: '', total: 0 });

    // Store items as comma-separated string for simple sheet storage
    await api.create('Orders', { ...order, items: orderItems.join(',') });
    loadOrders();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Order Management</h2>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm">
          <Plus className="w-4 h-4" /> New Order
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
                  <th className="px-6 py-4 font-semibold text-slate-500">Order ID</th>
                  <th className="px-6 py-4 font-semibold text-slate-500">Customer</th>
                  <th className="px-6 py-4 font-semibold text-slate-500">Items</th>
                  <th className="px-6 py-4 font-semibold text-slate-500">Total</th>
                  <th className="px-6 py-4 font-semibold text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-6 text-slate-500">No orders found.</td></tr>
                ) : orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-blue-600 font-medium">#{order.id.slice(-6)}</td>
                    <td className="px-6 py-4">{order.customer}</td>
                    <td className="px-6 py-4 text-slate-500">{order.items.join(', ')}</td>
                    <td className="px-6 py-4 font-medium">₹{order.total.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{order.status}</span>
                    </td>
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
            <h3 className="text-xl font-bold text-slate-900 mb-4">Create Order</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="block text-sm mb-1">Customer</label><input required className="w-full border rounded px-3 py-2" value={newOrder.customer} onChange={e => setNewOrder({...newOrder, customer: e.target.value})} /></div>
              <div><label className="block text-sm mb-1">Items (comma separated)</label><input required className="w-full border rounded px-3 py-2" value={newOrder.items} onChange={e => setNewOrder({...newOrder, items: e.target.value})} /></div>
              <div><label className="block text-sm mb-1">Total Amount</label><input required type="number" className="w-full border rounded px-3 py-2" value={newOrder.total} onChange={e => setNewOrder({...newOrder, total: parseInt(e.target.value)})} /></div>
              <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Submit Order</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Orders;