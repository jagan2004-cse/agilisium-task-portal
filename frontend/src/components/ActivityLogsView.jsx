import React, { useState, useEffect } from 'react';
import { History, User, ShieldCheck } from 'lucide-react';
import { logsAPI } from '../api';

export default function ActivityLogsView() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await logsAPI.getLogs();
      setLogs(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">System Audit & Activity Logs</h2>
        <p className="text-xs text-slate-300 mt-1">Timestamped audit trail recording login, task creation, evidence uploads, approvals, and reports</p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10 pb-3">
              <tr>
                <th className="pb-3 px-3">Timestamp</th>
                <th className="pb-3 px-3">User</th>
                <th className="pb-3 px-3">Action Event</th>
                <th className="pb-3 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400">No activity logged yet.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition">
                    <td className="py-3 px-3 font-medium text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-bold text-cyan-300">
                      {log.user_details?.full_name || 'System'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{log.details}</td>
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
