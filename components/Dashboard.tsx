import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  CheckCircle, 
  TrendingUp, 
  Sparkles,
  IndianRupee,
  AlertTriangle,
  UserPlus,
  FileText,
  Briefcase,
  ShoppingCart,
  Clock,
  Activity,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { generateDailyReport } from '../services/geminiService';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface DashboardProps {
  user: User;
}

// --- Mock Chart Data (Static for visualization consistency) ---
const visitTrendData = [
  { name: 'Mon', scheduled: 12, completed: 10 },
  { name: 'Tue', scheduled: 15, completed: 12 },
  { name: 'Wed', scheduled: 18, completed: 16 },
  { name: 'Thu', scheduled: 14, completed: 14 },
  { name: 'Fri', scheduled: 20, completed: 18 },
];

const attendanceData = [
  { name: 'Mon', present: 45, absent: 3 },
  { name: 'Tue', present: 46, absent: 2 },
  { name: 'Wed', present: 44, absent: 4 },
  { name: 'Thu', present: 47, absent: 1 },
  { name: 'Fri', present: 45, absent: 3 },
];

const leadStatusData = [
  { name: 'New', value: 15 },
  { name: 'Contacted', value: 25 },
  { name: 'Qualified', value: 10 },
  { name: 'Converted', value: 5 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

// --- Reusable Widget Components ---

const StatCard = ({ label, value, icon: Icon, color, bg, subtext }: any) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 transition-transform hover:scale-[1.02]">
    <div className={`p-3 rounded-lg ${bg}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  </div>
);

const RevenueChart = () => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
    <div className="flex justify-between items-center mb-6">
       <h3 className="font-semibold text-slate-800">Revenue Trend</h3>
       <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">+12.5% vs last week</span>
    </div>
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
         <AreaChart data={visitTrendData}>
            <defs>
              <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Area type="monotone" dataKey="scheduled" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" />
         </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const LeadPipelineChart = () => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
    <h3 className="font-semibold text-slate-800 mb-6">Lead Pipeline</h3>
    <div className="h-72 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie 
            data={leadStatusData} 
            cx="50%" 
            cy="50%" 
            innerRadius={80} 
            outerRadius={110} 
            paddingAngle={5} 
            dataKey="value"
          >
            {leadStatusData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
            <tspan x="50%" dy="-10" fontSize="24" fontWeight="bold" fill="#1e293b">1,240</tspan>
            <tspan x="50%" dy="20" fontSize="12" fill="#64748b">Total Leads</tspan>
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
    <div className="flex justify-center gap-4 mt-4">
      {leadStatusData.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
          <span className="text-xs text-slate-500">{entry.name}</span>
        </div>
      ))}
    </div>
  </div>
);

const AttendanceChart = () => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
    <h3 className="font-semibold text-slate-800 mb-6">Weekly Attendance</h3>
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={attendanceData} barSize={20}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const OnboardingList = () => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
    <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-slate-800">Pending Onboarding</h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
    </div>
    <div className="space-y-4">
      {[
        { name: 'Alice Newhire', role: 'Sales Exec', step: 'Doc Verification', progress: 70 },
        { name: 'Bob Intern', role: 'Field Agent', step: 'Equipment Handover', progress: 40 },
        { name: 'Charlie Temp', role: 'Driver', step: 'Account Setup', progress: 20 },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
            {item.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="font-medium text-slate-800 text-sm">{item.name}</span>
              <span className="text-xs text-slate-500">{item.progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${item.progress}%` }}></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide">Current: {item.step}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const TodaySchedule = ({ items }: { items: any[] }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
    <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-slate-800">Today's Schedule</h3>
        <span className="text-xs text-slate-500">{new Date().toLocaleDateString()}</span>
    </div>
    <div className="space-y-3">
      {items.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No visits scheduled for today.</div>
      ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group">
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
                <span className="text-xs font-bold text-slate-500">{item.time || '10:00 AM'}</span>
                <div className="h-full w-0.5 bg-slate-200 group-last:hidden"></div>
            </div>
            <div className="flex-1 pb-2">
                <div className="flex justify-between items-start">
                    <p className="font-medium text-slate-800 text-sm">{item.customerName || item.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        item.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'
                    }`}>
                        {item.status}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{item.address || 'Remote'}</span>
                </div>
            </div>
            </div>
        ))
      )}
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  
  // Real-time stats state
  const [stats, setStats] = useState({
    visits: 0,
    visitsTotal: 0,
    leads: 0,
    tasks: 0,
    orders: 0,
    expenses: 0,
    staff: 0,
    attendance: 0
  });
  
  const [todaysVisits, setTodaysVisits] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Helper for consistent date check
  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoadingData(true);
    try {
        // Fetch all necessary data in parallel
        const [visitsData, leadsData, tasksData, ordersData, expensesData, usersData, attendanceData] = await Promise.all([
            api.fetch('Visits'),
            api.fetch('Leads'),
            api.fetch('Tasks'),
            api.fetch('Orders'),
            api.fetch('Expenses'),
            api.fetch('Users'),
            api.fetch('Attendance')
        ]);

        const today = getTodayDateString();

        // Process based on Role
        if (user.role === UserRole.ADMIN) {
            setStats({
                visits: visitsData.filter((v: any) => v.status === 'Scheduled').length,
                visitsTotal: visitsData.length,
                leads: leadsData.length,
                tasks: tasksData.filter((t: any) => t.status === 'Pending').length,
                orders: ordersData.length,
                expenses: expensesData.filter((e: any) => e.status === 'Pending').length,
                staff: usersData.length,
                attendance: attendanceData.filter((a: any) => a.date === today && a.inTime).length
            });
            // Admin sees all visits for today
            setTodaysVisits(visitsData.filter((v: any) => v.date && v.date.includes(today)).slice(0, 5));
        } 
        else if (user.role === UserRole.HR) {
            setStats({
                visits: 0,
                visitsTotal: 0,
                leads: 0,
                tasks: 0,
                orders: 0,
                expenses: expensesData.filter((e: any) => e.status === 'Pending').length,
                staff: usersData.length,
                attendance: attendanceData.filter((a: any) => a.date === today && a.inTime).length
            });
        }
        else {
            // Employee view (Filtered by their name/ID)
            const myVisits = visitsData.filter((v: any) => (v.assignedTo === user.name || v.assignedTo?.includes(user.name.split(' ')[0])));
            const myTasks = tasksData.filter((t: any) => (t.assignedTo === user.name || t.assignedTo?.includes(user.name.split(' ')[0])) && t.status === 'Pending');
            const myOrders = ordersData.filter((o: any) => o.customer.toLowerCase().includes('my customer')); // Mock filter logic
            const myExpenses = expensesData.filter((e: any) => e.description.includes(user.name) || e.status === 'Pending'); // Simplified

            // Fix: Check for exact date match OR prefix match for attendance
            const isPresent = attendanceData.find((a: any) => 
                String(a.userId) === String(user.id) && 
                (a.date === today || a.date?.startsWith(today)) && 
                a.inTime
            );

            setStats({
                visits: myVisits.filter((v: any) => v.status === 'Scheduled').length,
                visitsTotal: myVisits.length,
                leads: 0,
                tasks: myTasks.length,
                orders: myOrders.length,
                expenses: myExpenses.length,
                staff: 0,
                attendance: isPresent ? 1 : 0
            });
            
            setTodaysVisits(myVisits.filter((v: any) => v.date && v.date.includes(today)).slice(0, 5));
        }

    } catch (error) {
        console.error("Failed to load dashboard data", error);
    } finally {
        setLoadingData(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    const contextData = {
      role: user.role,
      summary: "Daily Activity Summary",
      user: user.name,
      stats: stats
    };
    const result = await generateDailyReport(contextData);
    setReport(result);
    setLoadingReport(false);
  };

  // --- Dynamic Configuration ---
  const getDashboardConfig = (role: UserRole) => {
    const statsWidgets = [];
    const mainWidgets = [];
    let gridClass = "grid grid-cols-1 lg:grid-cols-2 gap-6";

    if (loadingData) {
        // Return skeleton or empty while loading
        return { statsWidgets: [], mainWidgets: [], gridClass }; 
    }

    // 1. Stats Configuration
    if (role === UserRole.ADMIN) {
      statsWidgets.push(
        { label: 'Total Revenue', value: `₹${(stats.orders * 15000).toLocaleString()}`, icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-50', subtext: 'Est. from Orders' },
        { label: 'Active Leads', value: stats.leads, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', subtext: 'In Pipeline' },
        { label: 'Pending Expenses', value: stats.expenses, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', subtext: 'Requires Approval' },
        { label: 'Total Staff', value: stats.staff, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', subtext: `${stats.attendance} Present Today` }
      );
      mainWidgets.push(
        { component: RevenueChart, colSpan: 'col-span-1' },
        { component: LeadPipelineChart, colSpan: 'col-span-1' }
      );
    } else if (role === UserRole.HR) {
      statsWidgets.push(
        { label: 'Present Today', value: `${stats.attendance}/${stats.staff}`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', subtext: 'Attendance Rate' },
        { label: 'On Leave', value: Math.max(0, stats.staff - stats.attendance - 2), icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', subtext: 'Planned Leaves' },
        { label: 'Pending Onboarding', value: '3', icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50', subtext: 'New Joinees' },
        { label: 'Expense Requests', value: stats.expenses, icon: IndianRupee, color: 'text-purple-600', bg: 'bg-purple-50', subtext: 'To Process' }
      );
      mainWidgets.push(
        { component: AttendanceChart, colSpan: 'col-span-1' },
        { component: OnboardingList, colSpan: 'col-span-1' }
      );
    } else {
      // Employee
      statsWidgets.push(
        { label: 'Visits Today', value: stats.visits, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50', subtext: 'Scheduled' },
        { label: 'Pending Tasks', value: stats.tasks, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50', subtext: 'High Priority' },
        { label: 'My Orders', value: stats.orders, icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50', subtext: 'This Month' },
        { label: 'Attendance', value: stats.attendance ? 'Present' : 'Not Punched', icon: Clock, color: stats.attendance ? 'text-green-600' : 'text-slate-400', bg: stats.attendance ? 'bg-green-50' : 'bg-slate-100', subtext: 'Status' }
      );
      gridClass = "grid grid-cols-1 lg:grid-cols-3 gap-6";
      mainWidgets.push(
        { component: () => <TodaySchedule items={todaysVisits} />, colSpan: 'lg:col-span-2' },
        { component: () => (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
                <h3 className="font-semibold text-slate-800 mb-4">My Performance</h3>
                <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{name: 'Visits', value: stats.visitsTotal}, {name: 'Orders', value: stats.orders}]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
                </div>
            </div>
        ), colSpan: 'col-span-1' }
      );
    }

    return { statsWidgets, mainWidgets, gridClass };
  };

  const config = getDashboardConfig(user.role);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{user.role === UserRole.EMPLOYEE ? 'My' : user.role} Dashboard</h1>
          <p className="text-slate-500">
             Welcome back, {user.name}. 
             {loadingData ? ' Syncing data...' : ' Here is your overview.'}
          </p>
        </div>
        <button 
          onClick={handleGenerateReport}
          disabled={loadingReport || loadingData}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2.5 rounded-lg shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all disabled:opacity-70 transform hover:-translate-y-0.5"
        >
          <Sparkles className={`w-4 h-4 ${loadingReport ? 'animate-pulse' : ''}`} />
          {loadingReport ? "Analyzing Data..." : "Generate AI Insights"}
        </button>
      </div>

      {report && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 p-6 rounded-xl shadow-sm relative animate-fade-in-up">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" /> Executive AI Summary
            </h3>
            <button onClick={() => setReport(null)} className="p-1 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <Activity className="w-4 h-4" />
            </button>
          </div>
          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line leading-relaxed">
            {report}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingData 
         ? [1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-xl shadow-sm animate-pulse"></div>)
         : config.statsWidgets.map((stat, idx) => (
            <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Widgets Grid */}
      <div className={config.gridClass}>
        {loadingData
          ? <div className="col-span-full h-64 bg-white rounded-xl shadow-sm animate-pulse"></div>
          : config.mainWidgets.map((widget, idx) => {
            const WidgetComponent = widget.component;
            return (
                <div key={idx} className={widget.colSpan}>
                <WidgetComponent />
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default Dashboard;