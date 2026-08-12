import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, TrendingUp, Layers, ChevronDown, CheckCircle2 } from 'lucide-react';
import { defaultersReportsAPI, tasksAPI } from '../api';

export default function DefaultersReportsView({ theme = localStorage.getItem('theme') || 'dark' }) {
  const [defaultersData, setDefaultersData] = useState({ total_defaulters: 0, defaulters: [], grouped_defaulters: [] });
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  useEffect(() => {
    fetchTasks();
    fetchDefaulters();
  }, [selectedTaskId]);

  const fetchTasks = async () => {
    try {
      const res = await tasksAPI.getTasks();
      setTasks(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDefaulters = async () => {
    try {
      const res = await defaultersReportsAPI.getDefaulters({ task_id: selectedTaskId || undefined });
      setDefaultersData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const isLight = theme === 'light';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`rounded-3xl p-6 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
      }`}>
        <div>
          <h2 className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Defaulters & Reports Hub</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Task Dropdown Selector */}
          <div className="relative min-w-[220px]">
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold transition focus:outline-none appearance-none cursor-pointer pr-8 ${
                isLight 
                  ? 'bg-slate-100 border-slate-300 text-slate-900 focus:border-rose-500' 
                  : 'bg-[#061b27] border-[#18485e] text-white focus:border-rose-500'
              }`}
            >
              <option value="">📋 All Created Tasks ({tasks.length})</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  📌 {t.title} ({t.category_name || 'Task'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-3 pointer-events-none text-slate-400" />
          </div>

          <button
            onClick={() => defaultersReportsAPI.exportExcel('defaulters', selectedTaskId || undefined)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 flex items-center gap-2 cursor-pointer transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Defaulters Excel</span>
          </button>
        </div>
      </div>

      {/* Subheader Counter Pill */}
      <div className="flex items-center justify-end">
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-500/20 text-rose-600 border border-rose-500/40">
          {defaultersData.total_defaulters} Total Defaulters Detected
        </span>
      </div>

      {/* Grouped by Task Layout */}
      <div className="space-y-4">
        {(!defaultersData.grouped_defaulters || defaultersData.grouped_defaulters.length === 0) ? (
          <div className={`rounded-2xl p-12 text-center border ${
            isLight ? 'bg-white border-slate-200' : 'bg-[#09222f] border-slate-700'
          }`}>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>No Active Defaulters!</h3>
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              All batch members have submitted evidence for the selected task filter.
            </p>
          </div>
        ) : (
          defaultersData.grouped_defaulters.map((group) => (
            <div
              key={group.task_id}
              className={`rounded-2xl p-6 border space-y-4 transition-all ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-rose-500/30'
              }`}
            >
              <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3 ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}>
                <div>
                  <span className="text-[11px] font-extrabold text-teal-600 uppercase tracking-wider">Created Task</span>
                  <h3 className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{group.task_title}</h3>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Deadline: <strong className="text-slate-800 dark:text-slate-200">{group.due_date} at {group.due_time}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-rose-500/20 text-rose-600 border border-rose-500/40">
                    {group.total_defaulters} Defaulters Pending Evidence
                  </span>
                  <button
                    onClick={() => defaultersReportsAPI.exportExcel('defaulters', group.task_id)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs border border-rose-500/30 flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Task Excel</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`text-[11px] uppercase tracking-wider border-b pb-2 ${
                    isLight ? 'text-slate-600 border-slate-200' : 'text-slate-800'
                  }`}>
                    <tr>
                      <th className="pb-2 px-3">Batch User</th>
                      <th className="pb-2 px-3">Company Email</th>
                      <th className="pb-2 px-3">Overdue Duration</th>
                      <th className="pb-2 px-3">Assignment Status</th>
                      <th className="pb-2 px-3 text-right">Reminders</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800'}`}>
                    {group.defaulters.map((u) => (
                      <tr key={u.assignment_id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}>
                        <td className={`py-3 px-3 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{u.user_name}</td>
                        <td className={`py-3 px-3 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{u.user_email}</td>
                        <td className="py-3 px-3 font-extrabold text-rose-600">{u.days_late}</td>
                        <td className="py-3 px-3 font-semibold text-amber-500 uppercase text-[10px]">{u.status}</td>
                        <td className={`py-3 px-3 text-right ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{u.reminder_count} Notifications</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
