import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, TrendingUp, Mail, UserX } from 'lucide-react';
import { defaultersReportsAPI } from '../api';

export default function DefaultersReportsView() {
  const [defaultersData, setDefaultersData] = useState({ total_defaulters: 0, defaulters: [] });

  useEffect(() => {
    fetchDefaulters();
  }, []);

  const fetchDefaulters = async () => {
    try {
      const res = await defaultersReportsAPI.getDefaulters();
      setDefaultersData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Defaulters & Reports Hub</h2>
        </div>

        <button
          onClick={() => defaultersReportsAPI.exportExcel('defaulters')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 flex items-center gap-2 cursor-pointer transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Defaulters Excel Report</span>
        </button>
      </div>

      {/* Defaulter Table */}
      <div className="glass-card rounded-2xl p-6 border border-rose-500/30">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <span className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Active Defaulter List</span>
          </span>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
            {defaultersData.total_defaulters} Defaulters Detected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10 pb-3">
              <tr>
                <th className="pb-3 px-3">Batch User</th>
                <th className="pb-3 px-3">Email Address</th>
                <th className="pb-3 px-3">Task Title</th>
                <th className="pb-3 px-3">Deadline (Date & Time)</th>
                <th className="pb-3 px-3">Overdue Status</th>
                <th className="pb-3 px-3">Reminders Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {defaultersData.defaulters.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">🎉 No active defaulters! All batch users are on schedule.</td>
                </tr>
              ) : (
                defaultersData.defaulters.map((d) => (
                  <tr key={d.assignment_id} className="hover:bg-white/5 transition">
                    <td className="py-3.5 px-3 font-bold text-white">{d.user_name}</td>
                    <td className="py-3.5 px-3 text-slate-400">{d.user_email}</td>
                    <td className="py-3.5 px-3 text-cyan-300 font-medium">{d.task_title}</td>
                    <td className="py-3.5 px-3 text-slate-300">{d.due_date} at {d.due_time}</td>
                    <td className="py-3.5 px-3 font-bold text-rose-400">{d.days_late}</td>
                    <td className="py-3.5 px-3 text-slate-300">{d.reminder_count} Notifications</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
