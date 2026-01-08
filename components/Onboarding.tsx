import React, { useState, useEffect } from 'react';
import { OnboardingTask } from '../types';
import { CheckSquare, Clock, CheckCircle2, MoreHorizontal, Plus, FileText, Upload, X, Loader2 } from 'lucide-react';
import { api } from '../services/api';

const Onboarding: React.FC = () => {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({
    employeeName: '',
    task: '',
    dueDate: ''
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    const data = await api.fetch('Onboarding');
    setTasks(data);
    setLoading(false);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
  };

  const handleDrop = async (e: React.DragEvent, status: 'Pending' | 'In Progress' | 'Completed') => {
    e.preventDefault();
    if (!draggedItem) return;
    
    // Optimistic Update
    setTasks(tasks.map(t => t.id === draggedItem ? { ...t, status } : t));
    setDraggedItem(null);

    // API Update
    await api.update('Onboarding', { id: draggedItem, status });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const task: OnboardingTask = {
      id: Date.now().toString(),
      employeeName: newTask.employeeName,
      task: newTask.task,
      status: 'Pending',
      dueDate: newTask.dueDate
    };
    
    setTasks([...tasks, task]);
    setShowModal(false);
    setNewTask({ employeeName: '', task: '', dueDate: '' });

    await api.create('Onboarding', task);
    loadTasks();
  };

  const Column = ({ title, status, icon: Icon }: { title: string, status: 'Pending' | 'In Progress' | 'Completed', icon: any }) => (
    <div 
      className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col h-full min-h-[500px]"
      onDrop={(e) => handleDrop(e, status)}
      onDragOver={handleDragOver}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
           <Icon className="w-4 h-4" /> {title}
        </h3>
        <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-slate-500 shadow-sm border border-slate-100">
           {tasks.filter(t => t.status === status).length}
        </span>
      </div>
      
      <div className="flex-1 space-y-3">
         {tasks.filter(t => t.status === status).map(task => (
           <div 
             key={task.id} 
             draggable
             onDragStart={(e) => handleDragStart(e, task.id)}
             className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 cursor-move hover:shadow-md transition-all active:cursor-grabbing"
           >
              <div className="flex justify-between items-start mb-2">
                 <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                   {task.employeeName}
                 </span>
                 <button className="text-slate-300 hover:text-slate-500">
                   <MoreHorizontal className="w-4 h-4" />
                 </button>
              </div>
              <p className="font-medium text-slate-800 text-sm mb-3">{task.task}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500 border-t border-slate-50 pt-3">
                 <Clock className="w-3 h-3" /> Due: {task.dueDate}
              </div>
           </div>
         ))}
      </div>
      
      <button 
        onClick={() => setShowModal(true)}
        className="mt-4 w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors text-sm font-medium flex items-center justify-center gap-2"
      >
         <Plus className="w-4 h-4" /> Add Task
      </button>
    </div>
  );

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
       <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-900">Onboarding Board</h2>
           <p className="text-slate-500">Track onboarding progress for new hires.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
             <Upload className="w-4 h-4" /> Import Checklist
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center gap-2">
             <FileText className="w-4 h-4" /> New Template
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin"/></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-x-auto pb-4">
           <Column title="To Do" status="Pending" icon={CheckSquare} />
           <Column title="In Progress" status="In Progress" icon={Clock} />
           <Column title="Completed" status="Completed" icon={CheckCircle2} />
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Add Onboarding Task</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee Name</label>
                <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newTask.employeeName} onChange={e => setNewTask({...newTask, employeeName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Description</label>
                <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newTask.task} onChange={e => setNewTask({...newTask, task: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input required type="date" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">Add Task</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;