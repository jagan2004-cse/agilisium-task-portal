import React, { useState, useEffect } from 'react';
import { HardDrive, File, Database, Layers } from 'lucide-react';
import { storageAPI } from '../api';

export default function StorageAnalyticsView() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchStorage();
  }, []);

  const fetchStorage = async () => {
    try {
      const res = await storageAPI.getAnalytics();
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Storage & Local Media Manager</h2>
        <p className="text-xs text-slate-300 mt-1">Local media storage utilization, disk quota & largest files</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-cyan-400">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Uploaded Files</span>
          <p className="text-3xl font-extrabold text-white mt-2">{data?.total_files || 0}</p>
          <p className="text-[11px] text-cyan-300 mt-1">Images, PDF, PPT, Code</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-indigo-400">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Disk Storage Used</span>
          <p className="text-3xl font-extrabold text-white mt-2">{data?.total_size_mb || 0} MB</p>
          <p className="text-[11px] text-indigo-300 mt-1">{data?.total_size_gb || 0} GB of {data?.quota_gb || 50} GB Quota</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-emerald-400">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Remaining Storage</span>
          <p className="text-3xl font-extrabold text-white mt-2">{data?.remaining_gb || 50} GB</p>
          <p className="text-[11px] text-emerald-300 mt-1">Quota Usage: {data?.used_percentage || 0}%</p>
        </div>
      </div>

      {/* Largest Files Table */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span>Largest Uploaded Files</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10 pb-3">
              <tr>
                <th className="pb-3 px-3">File Name</th>
                <th className="pb-3 px-3">Uploaded By</th>
                <th className="pb-3 px-3">Size (MB)</th>
                <th className="pb-3 px-3">Upload Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!data?.largest_files || data.largest_files.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400">No files stored yet.</td>
                </tr>
              ) : (
                data.largest_files.map((f) => (
                  <tr key={f.id} className="hover:bg-white/5 transition">
                    <td className="py-3 px-3 font-semibold text-white">{f.file_name}</td>
                    <td className="py-3 px-3 text-cyan-300 font-bold">{f.user_name}</td>
                    <td className="py-3 px-3 text-slate-200">{f.size_mb} MB</td>
                    <td className="py-3 px-3 text-slate-400">{new Date(f.submitted_at).toLocaleDateString()}</td>
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
