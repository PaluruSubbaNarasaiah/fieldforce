import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Calendar, CheckCircle2, Clock, MoreHorizontal, Circle, X, Trash2, CheckSquare, ArrowUpCircle, Loader2, History
} from 'lucide-react';
import { Task, TaskPriority, TaskHistoryItem, User } from '../types';
import { api } from '../services/api';

interface TasksProps {
  user: User;
}

const Tasks: React.FC<TasksProps> = ({ user }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  
  // History Modal State
  const [historyModalTask, setHistoryModalTask] = useState<Task | null>(null);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: TaskPriority.MEDIUM,
    dueDate: '',
    assignedTo: 'Mike Ross'
  });

  // Fetch Tasks on Mount
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    const data = await api.fetch('Tasks');
    // Ensure history is parsed
    const processedTasks = data.map((t: any) => ({
      ...t,
      history: typeof t.history === 'string' ? safeParseJSON(t.history) : (t.history || [])
    }));
    setTasks(processedTasks);
    setLoading(false);
  };

  const safeParseJSON = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return [];
    }
  };

  const getPriorityColor = (priority: TaskPriority | string) => {
    switch(priority) {
      case TaskPriority.HIGH: return 'text-red-600 bg-red-50 border-red-100';
      case TaskPriority.MEDIUM: return 'text-orange-600 bg-orange-50 border-orange-100';
      case TaskPriority.LOW: return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'In Progress': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'Pending': return <Circle className="w-4 h-4 text-slate-400" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getFilteredTasks = () => {
    return tasks.filter(t => {
      if (filter === 'All') return true;
      if (filter === 'High Priority') return t.priority === TaskPriority.HIGH;
      return t.status === filter;
    });
  };

  const filteredTasks = getFilteredTasks();

  const createHistoryItem = (action: string): TaskHistoryItem => ({
    timestamp: new Date().toISOString(),
    action,
    changedBy: user.name
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const history = [createHistoryItem('Task Created')];
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      status: 'Pending',
      assignedTo: newTask.assignedTo,
      dueDate: newTask.dueDate,
      history
    };
    
    setTasks([task, ...tasks]);
    setShowModal(false);
    setNewTask({ title: '', description: '', priority: TaskPriority.MEDIUM, dueDate: '', assignedTo: 'Mike Ross' });
    
    // Store history as JSON string
    await api.create('Tasks', { ...task, history: JSON.stringify(history) });
    loadTasks(); 
  };

  const updateTask = async (id: string, updates: Partial<Task>, actionDescription: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newHistoryEntry = createHistoryItem(actionDescription);
    const updatedHistory = [newHistoryEntry, ...(task.history || [])];
    
    const updatedTask = { ...task, ...updates, history: updatedHistory };
    
    setTasks(tasks.map(t => t.id === id ? updatedTask : t));
    
    await api.update('Tasks', { 
        id, 
        ...updates, 
        history: JSON.stringify(updatedHistory) 
    });
  };

  const toggleStatus = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    let newStatus: 'Pending' | 'In Progress' | 'Completed' = 'Pending';
    if (task.status === 'Pending') newStatus = 'In Progress';
    else if (task.status === 'In Progress') newStatus = 'Completed';
    else newStatus = 'Pending';

    await updateTask(id, { status: newStatus }, `Status changed to ${newStatus}`);
  };

  // --- Bulk Selection Logic ---

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTasks(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length && filteredTasks.length > 0) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleBulkAction = async (action: 'complete' | 'delete' | 'priority_high') => {
    if (selectedTasks.size === 0) return;
    const idsToProcess = Array.from(selectedTasks);

    if (action === 'delete') {
      if (window.confirm(`Are you sure you want to delete ${selectedTasks.size} tasks?`)) {
        setTasks(tasks.filter(t => !selectedTasks.has(t.id)));
        setSelectedTasks(new Set());
        await Promise.all(idsToProcess.map(id => api.delete('Tasks', id)));
      }
    } else if (action === 'complete') {
      // Optimistic bulk update
      setTasks(tasks.map(t => selectedTasks.has(t.id) ? { 
          ...t, 
          status: 'Completed',
          history: [createHistoryItem('Bulk status update: Completed'), ...(t.history || [])]
      } : t));
      
      setSelectedTasks(new Set());

      // API calls
      await Promise.all(idsToProcess.map(id => {
          const task = tasks.find(t => t.id === id);
          if (task) {
              const updatedHistory = [createHistoryItem('Bulk status update: Completed'), ...(task.history || [])];
              return api.update('Tasks', { id, status: 'Completed', history: JSON.stringify(updatedHistory) });
          }
          return Promise.resolve();
      }));

    } else if (action === 'priority_high') {
       setTasks(tasks.map(t => selectedTasks.has(t.id) ? { 
          ...t, 
          priority: TaskPriority.HIGH,
          history: [createHistoryItem('Bulk priority update: High'), ...(t.history || [])]
      } : t));
      
      setSelectedTasks(new Set());

      await Promise.all(idsToProcess.map(id => {
          const task = tasks.find(t => t.id === id);
          if (task) {
              const updatedHistory = [createHistoryItem('Bulk priority update: High'), ...(task.history || [])];
              return api.update('Tasks', { id, priority: TaskPriority.HIGH, history: JSON.stringify(updatedHistory) });
          }
          return Promise.resolve();
      }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Task Management</h2>
        <div className="flex gap-2">
           {filteredTasks.length > 0 && (
             <button 
                onClick={toggleSelectAll}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                   selectedTasks.size === filteredTasks.length && filteredTasks.length > 0
                   ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                   : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
             >
                <CheckSquare className="w-4 h-4" />
                {selectedTasks.size === filteredTasks.length && filteredTasks.length > 0 ? 'Deselect All' : 'Select All'}
             </button>
           )}
           <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {['All', 'High Priority', 'Pending', 'In Progress'].map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setSelectedTasks(new Set()); }}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTasks.length === 0 ? (
                 <div className="col-span-full text-center py-10 text-slate-500">No tasks found.</div>
            ) : filteredTasks.map((task) => (
              <div 
                key={task.id} 
                className={`
                  p-5 rounded-xl shadow-sm border transition-all duration-200 group flex flex-col justify-between h-full relative
                  ${selectedTasks.has(task.id) 
                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' 
                    : 'bg-white border-slate-100 hover:shadow-md'}
                `}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <input 
                            type="checkbox"
                            checked={selectedTasks.has(task.id)}
                            onChange={() => toggleSelection(task.id)}
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setHistoryModalTask(task)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="View History"
                      >
                         <History className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div onClick={() => toggleSelection(task.id)} className="cursor-pointer">
                    <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{task.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{task.description}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/50 space-y-3">
                  <button 
                      onClick={() => toggleStatus(task.id)}
                      className="flex items-center justify-between text-sm w-full hover:bg-white p-1 rounded transition-colors group/status"
                    >
                      <div className="flex items-center gap-2 text-slate-600 group-hover/status:text-blue-600 transition-colors">
                        {getStatusIcon(task.status)}
                        <span className="font-medium">{task.status}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs bg-slate-50 px-2 py-1 rounded">
                        <Calendar className="w-3.5 h-3.5" />
                        {task.dueDate}
                      </div>
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                        {(task.assignedTo || 'U').split(' ').map(n=>n[0]).join('')}
                    </div>
                    <span className="text-xs text-slate-500">Assigned to <span className="text-slate-700 font-medium">{task.assignedTo}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedTasks.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-6 z-50 animate-fade-in-up border border-slate-700 backdrop-blur-md bg-opacity-95">
             <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
                <span className="font-bold text-lg bg-white text-slate-900 w-8 h-8 rounded-full flex items-center justify-center">{selectedTasks.size}</span>
                <span className="text-slate-400 text-sm font-medium">Selected</span>
             </div>
             <div className="flex items-center gap-2">
                 <button onClick={() => handleBulkAction('complete')} className="flex flex-col items-center gap-1 group px-2">
                    <div className="p-2 rounded-full bg-slate-800 group-hover:bg-green-600 transition-colors border border-slate-700">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-slate-400 group-hover:text-white font-medium">Complete</span>
                 </button>
                 
                 <button onClick={() => handleBulkAction('priority_high')} className="flex flex-col items-center gap-1 group px-2">
                    <div className="p-2 rounded-full bg-slate-800 group-hover:bg-orange-600 transition-colors border border-slate-700">
                        <ArrowUpCircle className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-slate-400 group-hover:text-white font-medium">High Prio</span>
                 </button>

                 <button onClick={() => handleBulkAction('delete')} className="flex flex-col items-center gap-1 group px-2">
                    <div className="p-2 rounded-full bg-slate-800 group-hover:bg-red-600 transition-colors border border-slate-700">
                        <Trash2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-slate-400 group-hover:text-white font-medium">Delete</span>
                 </button>
             </div>
             <button onClick={() => setSelectedTasks(new Set())} className="ml-2 text-slate-500 hover:text-white transition-colors bg-slate-800 p-1.5 rounded-full hover:bg-slate-700">
                <X className="w-5 h-5" />
             </button>
        </div>
      )}

      {/* History Modal */}
      {historyModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-scale-in relative max-h-[80vh] flex flex-col">
                <button onClick={() => setHistoryModalTask(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <History className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Task Audit Log</h3>
                        <p className="text-sm text-slate-500 truncate max-w-xs">{historyModalTask.title}</p>
                    </div>
                </div>
                
                <div className="overflow-y-auto flex-1 pr-2">
                    {!historyModalTask.history || historyModalTask.history.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 italic">No history available for this task.</div>
                    ) : (
                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200">
                            {historyModalTask.history.map((item, idx) => (
                                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-slate-200 group-hover:bg-blue-500 group-hover:ring-4 ring-blue-50 transition-all shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10"></div>
                                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] bg-white p-4 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-semibold text-slate-800 text-sm">{item.changedBy}</span>
                                            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{new Date(item.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-slate-600">{item.action}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">{new Date(item.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             </div>
        </div>
      )}

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Create New Task</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input required type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea rows={3} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})}></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as TaskPriority})}>
                    <option value={TaskPriority.LOW}>Low</option>
                    <option value={TaskPriority.MEDIUM}>Medium</option>
                    <option value={TaskPriority.HIGH}>High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input required type="date" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                <select className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}>
                  <option>Mike Ross</option>
                  <option>John Doe</option>
                  <option>Sarah Smith</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">Create Task</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;