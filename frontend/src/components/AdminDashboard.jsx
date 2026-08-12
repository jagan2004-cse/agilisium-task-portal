import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  HardDrive, 
  Download, 
  RefreshCw, 
  TrendingUp,
  FileCheck,
  BookOpen,
  Filter,
  Layers,
  ChevronDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { tasksAPI, defaultersReportsAPI, storageAPI, codeReviewAPI, submissionsAPI } from '../api';

export default function AdminDashboard({ onNavigate, theme = localStorage.getItem('theme') || 'dark' }) {
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [createdTasks, setCreatedTasks] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [taskStats, setTaskStats] = useState({ total: 0, pending: 0, completed: 0, approval_pending: 0 });
  const [defaultersData, setDefaultersData] = useState({ total_defaulters: 0, defaulters: [], grouped_defaulters: [] });
  const [storageData, setStorageData] = useState(null);
  const [rotationData, setRotationData] = useState(null);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      const [tasksRes, assignmentsRes, defaultersRes, storageRes, rotationRes] = await Promise.all([
        tasksAPI.getTasks(),
        tasksAPI.getAssignments(),
        defaultersReportsAPI.getDefaulters(),
        storageAPI.getAnalytics(),
        codeReviewAPI.getDashboard()
      ]);

      const loadedTasks = tasksRes.data.results || tasksRes.data;
      setCreatedTasks(loadedTasks);
      setAllAssignments(assignmentsRes.data);
      setDefaultersData(defaultersRes.data);
      setStorageData(storageRes.data);
      setRotationData(rotationRes.data);
    } catch (err) {
      console.error('Failed to load admin metrics', err);
    }
  };

  // Compute metrics based on selectedTaskId filter
  const filteredAssignments = selectedTaskId
    ? allAssignments.filter(a => String(a.task_details?.id || a.task) === String(selectedTaskId))
    : allAssignments;

  const totalAssignedUsers = selectedTaskId
    ? filteredAssignments.length
    : 25; // Default batch count

  const completedCount = filteredAssignments.filter(a => a.status === 'APPROVED' || a.status === 'COMPLETED').length;
  const pendingApprovalCount = filteredAssignments.filter(a => a.status === 'PENDING_APPROVAL').length;

  const filteredDefaulters = selectedTaskId
    ? defaultersData.defaulters.filter(d => String(d.task_id) === String(selectedTaskId))
    : defaultersData.defaulters;

  const isLight = theme === 'light';

  const chartData = [
    { name: 'Completed', count: completedCount, fill: '#10b981' },
    { name: 'Pending Review', count: pendingApprovalCount, fill: '#0284c7' },
    { name: 'Defaulters', count: filteredDefaulters.length, fill: '#f43f5e' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header with Task Selector Dropdown */}
      <div className={`rounded-3xl p-6 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
      }`}>
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-teal-700' : 'text-[#56e3ce]'}`}>Admin Control Center</span>
          <h2 className={`text-2xl font-black mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>Agilisium Training Batch Analytics</h2>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Task & Defaulter Overview for <strong className="text-teal-600">Batch 12</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* 📋 Filter by Task Dropdown */}
          <div className="relative min-w-[220px]">
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold transition focus:outline-none appearance-none cursor-pointer pr-8 ${
                isLight 
                  ? 'bg-slate-100 border-slate-300 text-slate-900 focus:border-teal-600' 
                  : 'bg-[#061b27] border-[#18485e] text-white focus:border-[#56e3ce]'
              }`}
            >
              <option value="">📋 All Created Tasks ({createdTasks.length})</option>
              {createdTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  📌 {t.title} ({t.category_name || 'Task'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-3 pointer-events-none text-slate-400" />
          </div>

          <button
            onClick={() => submissionsAPI.bulkDownloadSingleFolder(selectedTaskId || undefined)}
            className="px-3.5 py-2.5 rounded-xl bg-[#005f73] hover:bg-[#0a9396] text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition"
          >
            <Download className="w-4 h-4" />
            <span>Bulk ZIP</span>
          </button>
          <button
            onClick={() => defaultersReportsAPI.exportExcel('completed', selectedTaskId || undefined)}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Selected Task Filter Indicator Pill */}
      {selectedTaskId && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-700 text-xs font-bold">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>Filtering Dashboard Metrics for Task: <strong>{createdTasks.find(t => String(t.id) === String(selectedTaskId))?.title}</strong></span>
          </div>
          <button
            onClick={() => setSelectedTaskId('')}
            className="hover:underline font-extrabold text-rose-600 cursor-pointer"
          >
            Clear Filter (Show All Tasks)
          </button>
        </div>
      )}

      {/* KPI Cards Grid - Filtered by Selected Task */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border-l-4 border-teal-500 border shadow-sm transition-all ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#09222f] border-[#144052]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Assigned Users</span>
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <p className={`text-3xl font-extrabold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalAssignedUsers}</p>
          <p className="text-[11px] text-teal-700 mt-1 font-semibold">
            {selectedTaskId ? 'Assigned to Selected Task' : 'Data Engineering & AI Batch'}
          </p>
        </div>

        <div className={`p-5 rounded-2xl border-l-4 border-emerald-500 border shadow-sm transition-all ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#09222f] border-[#144052]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Completed Evidence</span>
            <FileCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <p className={`text-3xl font-extrabold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{completedCount}</p>
          <button onClick={() => defaultersReportsAPI.exportExcel('completed', selectedTaskId || undefined)} className="text-[11px] text-emerald-600 hover:underline mt-1 font-bold block cursor-pointer">
            Export Completed Excel →
          </button>
        </div>

        <div className={`p-5 rounded-2xl border-l-4 border-amber-500 border shadow-sm transition-all ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#09222f] border-[#144052]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Pending Approvals</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className={`text-3xl font-extrabold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{pendingApprovalCount}</p>
          <button onClick={() => onNavigate('submissions')} className="text-[11px] text-amber-600 hover:underline mt-1 font-bold block">
            Review Submissions →
          </button>
        </div>

        <div className={`p-5 rounded-2xl border-l-4 border-rose-500 border shadow-sm transition-all ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#09222f] border-[#144052]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Active Defaulters</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <p className={`text-3xl font-extrabold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{filteredDefaulters.length}</p>
          <button onClick={() => onNavigate('defaulters')} className="text-[11px] text-rose-600 hover:underline mt-1 font-bold block">
            View Defaulter Hub →
          </button>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Analytics Chart */}
        <div className={`rounded-2xl p-5 lg:col-span-2 border transition-all ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
        }`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <TrendingUp className="w-4 h-4 text-teal-600" />
            <span>Task Submission & Approval Matrix {selectedTaskId && '(Filtered)'}</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke={isLight ? '#475569' : '#94a3b8'} fontSize={12} />
                <YAxis stroke={isLight ? '#475569' : '#94a3b8'} fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isLight ? '#ffffff' : '#061b27', 
                    borderColor: isLight ? '#cbd5e1' : '#18485e', 
                    borderRadius: '12px', 
                    color: isLight ? '#0f172a' : '#ffffff' 
                  }}
                  itemStyle={{ color: isLight ? '#0f172a' : '#ffffff', fontWeight: '600' }}
                  labelStyle={{ color: isLight ? '#0f172a' : '#ffffff', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Code Explanation Cycle Tracker Highlight Card */}
        <div 
          className={`rounded-2xl p-5 border flex flex-col justify-between cursor-pointer transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-sm hover:border-purple-500' : 'bg-[#09222f] border-[#144052] hover:border-purple-500/50'
          }`}
          onClick={() => onNavigate('rotation')}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span>Code Review Tracker</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 border border-purple-500/30">
                Cycle #{rotationData?.cycle?.cycle_number || 1}
              </span>
            </div>

            <h4 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Code Explanation Progress</h4>
            <div className="mt-4 space-y-3">
              <div className={`p-3 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#061b27] border-[#18485e]'
              }`}>
                <span className={`text-[11px] block font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Explanations Completed</span>
                <p className={`text-lg font-bold mt-0.5 ${isLight ? 'text-teal-700' : 'text-cyan-300'}`}>
                  {rotationData?.completed_count || 0} / {rotationData?.total_members || 27} Members
                </p>
              </div>

              <div className={`p-3 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#061b27] border-[#18485e]'
              }`}>
                <span className={`text-[11px] block font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Completed Today</span>
                <p className="text-sm font-bold text-emerald-600 mt-0.5">
                  {rotationData?.today_completed_count || 0} Members Finished
                </p>
              </div>
            </div>
          </div>

          <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
            isLight ? 'border-slate-200' : 'border-[#144052]'
          }`}>
            <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Cycle Completion</span>
            <span className="font-bold text-purple-600">{rotationData?.progress_pct || 0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
