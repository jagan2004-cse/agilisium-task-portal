import React, { useState, useEffect } from 'react';
import { HardDrive, File, Database, Layers } from 'lucide-react';
import { storageAPI } from '../api';

export default function StorageAnalyticsView({ theme = localStorage.getItem('theme') || 'dark' }) {
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

  const isLight = theme === 'light';

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Storage & Local Media Manager</h2>
        <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>Local media storage utilization, disk quota & largest files</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border-l-4 border-teal-500 border transition-all ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
        }`}>
          <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Total Uploaded Files</span>
          <p className={`text-3xl font-extrabold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{data?.total_files || 0}</p>
          <p className="text-[11px] text-teal-700 font-semibold mt-1">Images, PDF, PPT, Code</p>
        </div>

        <div className={`p-5 rounded-2xl border-l-4 border-indigo-500 border transition-all ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
        }`}>
          <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Disk Storage Used</span>
          <p className={`text-3xl font-extrabold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{data?.total_size_mb || 0} MB</p>
          <p className="text-[11px] text-indigo-600 font-semibold mt-1">{data?.total_size_gb || 0} GB of {data?.quota_gb || 50} GB Quota</p>
        </div>

        <div className={`p-5 rounded-2xl border-l-4 border-emerald-500 border transition-all ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
        }`}>
          <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Remaining Storage</span>
          <p className={`text-3xl font-extrabold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{data?.remaining_gb || 50} GB</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Quota Usage: {data?.used_percentage || 0}%</p>
        </div>
      </div>

      {/* Largest Files Table */}
      <div className={`rounded-2xl p-6 border ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
      }`}>
        <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${
          isLight ? 'text-slate-900' : 'text-white'
        }`}>
          <HardDrive className="w-4 h-4 text-teal-600" />
          <span>Largest Uploaded Files</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`text-[11px] uppercase tracking-wider border-b pb-3 ${
              isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-white/10'
            }`}>
              <tr>
                <th className="pb-3 px-3">File Name</th>
                <th className="pb-3 px-3">Uploaded By</th>
                <th className="pb-3 px-3">Size (MB)</th>
                <th className="pb-3 px-3">Upload Date</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
              {!data?.largest_files || data.largest_files.length === 0 ? (
                <tr>
                  <td colSpan="4" className={`py-8 text-center ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>No files stored yet.</td>
                </tr>
              ) : (
                data.largest_files.map((f) => (
                  <tr key={f.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}>
                    <td className={`py-3 px-3 font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{f.file_name}</td>
                    <td className="py-3 px-3 text-teal-700 font-bold">{f.user_name}</td>
                    <td className={`py-3 px-3 font-medium ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{f.size_mb} MB</td>
                    <td className={`py-3 px-3 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{new Date(f.submitted_at).toLocaleDateString()}</td>
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
