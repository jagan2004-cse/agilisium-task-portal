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
  BookOpen
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { tasksAPI, defaultersReportsAPI, storageAPI, codeReviewAPI, submissionsAPI } from '../api';

export default function AdminDashboard({ onNavigate }) {
  const [taskStats, setTaskStats] = useState({ total: 0, pending: 0, completed: 0, approval_pending: 0 });
  const [defaultersCount, setDefaultersCount] = useState(0);
  const [storageData, setStorageData] = useState(null);
  const [rotationData, setRotationData] = useState(null);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      const [tasksRes, defaultersRes, storageRes, rotationRes] = await Promise.all([
        tasksAPI.getAssignments(),
        defaultersReportsAPI.getDefaulters(),
        storageAPI.getAnalytics(),
        codeReviewAPI.getDashboard()
      ]);

      const assignments = tasksRes.data;
      const pending = assignments.filter(a => a.status === 'PENDING').length;
      const approvalPending = assignments.filter(a => a.status === 'PENDING_APPROVAL').length;
      const completed = assignments.filter(a => a.status === 'APPROVED' || a.status === 'COMPLETED').length;

      setTaskStats({
        total: assignments.length,
        pending,
        approval_pending: approvalPending,
        completed
      });

      setDefaultersCount(defaultersRes.data.total_defaulters);
      setStorageData(storageRes.data);
      setRotationData(rotationRes.data);
    } catch (err) {
      console.error('Failed to load admin metrics', err);
    }
  };

  const chartData = [
    { name: 'Completed', count: taskStats.completed, fill: '#10b981' },
    { name: 'Pending Review', count: taskStats.approval_pending, fill: '#06b6d4' },
    { name: 'Defaulters', count: defaultersCount, fill: '#f43f5e' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="glass-card rounded-3xl p-6 bg-slate-800 border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Admin Control Center</span>
          <h2 className="text-2xl font-bold text-white mt-1">Agilisium Training Batch Analytics</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => submissionsAPI.bulkDownloadSingleFolder()}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition"
          >
            <Download className="w-4 h-4" />
            <span>Bulk Download Submissions (.ZIP)</span>
          </button>
          <button
            onClick={() => defaultersReportsAPI.exportExcel('completed')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition shadow-lg"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Export Completed Excel Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Clean 3-Card Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-cyan-400">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Batch Users</span>
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">25</p>
          <p className="text-[11px] text-cyan-300 mt-1">Data Engineering & AI Batch</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-emerald-400">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Evidence</span>
            <FileCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{taskStats.completed}</p>
          <button onClick={() => defaultersReportsAPI.exportExcel('completed')} className="text-[11px] text-emerald-300 hover:underline mt-1 font-bold block cursor-pointer">
            Export Completed Excel →
          </button>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-amber-400">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">{taskStats.approval_pending}</p>
          <button onClick={() => onNavigate('submissions')} className="text-[11px] text-amber-300 hover:underline mt-1 font-medium block">
            Review Submissions →
          </button>
        </div>
      </div>

      {/* Main Charts & Rotation Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Analytics Chart */}
        <div className="glass-card rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>Task Submission & Approval Matrix</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#ffffff' }}
                  itemStyle={{ color: '#ffffff', fontWeight: '600' }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
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
          className="glass-card rounded-2xl p-5 flex flex-col justify-between cursor-pointer hover:border-purple-500/50 transition" 
          onClick={() => onNavigate('rotation')}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                <span>Code Review Tracker</span>
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Cycle #{rotationData?.cycle?.cycle_number || 1}
              </span>
            </div>

            <h4 className="text-base font-bold text-white">Code Explanation Progress</h4>
            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                <span className="text-[11px] text-slate-400 block font-medium">Explanations Completed</span>
                <p className="text-lg font-bold text-cyan-300 mt-0.5">
                  {rotationData?.completed_count || 0} / {rotationData?.total_members || 27} Members
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                <span className="text-[11px] text-slate-400 block font-medium">Completed Today</span>
                <p className="text-sm font-bold text-emerald-300 mt-0.5">
                  {rotationData?.today_completed_count || 0} Members Finished
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-400">Cycle Completion</span>
            <span className="font-bold text-purple-300">{rotationData?.progress_pct || 0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
