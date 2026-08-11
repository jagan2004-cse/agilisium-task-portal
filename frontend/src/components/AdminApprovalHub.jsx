import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Download, FileText, Eye, Check, X, Filter } from 'lucide-react';
import { submissionsAPI, approvalsAPI, tasksAPI } from '../api';

export default function AdminApprovalHub({ user, theme = localStorage.getItem('theme') || 'dark' }) {
  const [submissions, setSubmissions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedSub, setSelectedSub] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('APPROVED');
  const [comments, setComments] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    fetchSubmissions();
    fetchTasks();
  }, [selectedTaskId]);

  const fetchTasks = async () => {
    try {
      const res = await tasksAPI.getTasks();
      setTasks(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await submissionsAPI.getSubmissions({ task_id: selectedTaskId || undefined });
      setSubmissions(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load submissions', err);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      await approvalsAPI.reviewSubmission(selectedSub.id, reviewStatus, comments);
      setShowReviewModal(false);
      fetchSubmissions();
    } catch (err) {
      console.error('Failed review', err);
    }
  };

  const isLight = theme === 'light';

  return (
    <div className="space-y-6">
      {/* Header & Task Filter */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Submissions and Approvals</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Task Filter Select Dropdown */}
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold outline-none border transition cursor-pointer ${
              isLight ? 'bg-white border-slate-300 text-slate-900 shadow-sm' : 'bg-[#061b27] border-[#18485e] text-white'
            }`}
          >
            <option value="">All Tasks Proof</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Submissions Table Card */}
      <div className={`rounded-2xl p-6 border transition-all ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`text-[11px] uppercase tracking-wider border-b pb-3 ${
              isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-white/10'
            }`}>
              <tr>
                <th className="pb-3 px-3">Submitted By</th>
                <th className="pb-3 px-3">Task Title</th>
                <th className="pb-3 px-3">Export Filename Preview</th>
                <th className="pb-3 px-3">Submitted At</th>
                <th className="pb-3 px-3">Current Status</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan="6" className={`py-8 text-center ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>No submissions found.</td>
                </tr>
              ) : (
                submissions.map((sub) => {
                  const assignment = sub.assignment_details;
                  const userFirstName = sub.user_details?.first_name?.toLowerCase() || 'user';
                  const taskSlug = assignment?.task_details?.title?.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20) || 'task';
                  const formattedPreview = `${userFirstName}_${taskSlug}_${sub.file_name}`;

                  return (
                    <tr key={sub.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}>
                      <td className={`py-3.5 px-3 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {sub.user_details?.full_name}
                      </td>
                      <td className="py-3.5 px-3 text-teal-700 font-bold">
                        {assignment?.task_details?.title}
                      </td>
                      <td className={`py-3.5 px-3 font-mono text-[11px] ${isLight ? 'text-purple-700 font-semibold' : 'text-purple-300'}`}>
                        📁 {formattedPreview}
                      </td>
                      <td className={`py-3.5 px-3 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {new Date(sub.submitted_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          assignment?.status === 'APPROVED' || assignment?.status === 'COMPLETED' ? (isLight ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40') :
                          assignment?.status === 'REJECTED' ? (isLight ? 'bg-rose-50 text-rose-800 border border-rose-300' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40') :
                          (isLight ? 'bg-cyan-50 text-cyan-800 border border-cyan-300' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40')
                        }`}>
                          {assignment?.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right space-x-2">
                        {sub.file && (
                          <a
                            href={sub.file}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 border transition ${
                              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/20'
                            }`}
                          >
                            <Eye className="w-3 h-3" />
                            <span>Preview File</span>
                          </a>
                        )}

                        {user?.role !== 'USER' && (
                          <button
                            onClick={() => {
                              setSelectedSub(sub);
                              setShowReviewModal(true);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer inline-flex items-center gap-1 border transition ${
                              isLight ? 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-300' : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Review</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#09222f] border-[#144052] text-white'
          }`}>
            <h3 className="text-lg font-bold">Review Evidence Submission</h3>
            <p className="text-xs text-teal-700 font-semibold">{selectedSub.user_details?.full_name} • {selectedSub.file_name}</p>

            <form onSubmit={handleReview} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('APPROVED')}
                    className={`py-2 rounded-xl font-bold border transition ${
                      reviewStatus === 'APPROVED'
                        ? (isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-400' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60')
                        : (isLight ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-white/5 text-slate-400 border-white/10')
                    }`}
                  >
                    ✅ Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus('REJECTED')}
                    className={`py-2 rounded-xl font-bold border transition ${
                      reviewStatus === 'REJECTED'
                        ? (isLight ? 'bg-rose-50 text-rose-800 border-rose-400' : 'bg-rose-500/20 text-rose-300 border-rose-500/60')
                        : (isLight ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-white/5 text-slate-400 border-white/10')
                    }`}
                  >
                    ❌ Reject / Revise
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Review Comments</label>
                <textarea
                  rows="3"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Provide feedback..."
                  className={`w-full px-3.5 py-2.5 rounded-xl outline-none border transition ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-[#061b27] border-[#18485e] text-white placeholder:text-slate-500'
                  }`}
                />
              </div>

              <div className={`flex items-center justify-end gap-3 pt-4 border-t ${
                isLight ? 'border-slate-200' : 'border-[#144052]'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className={`px-4 py-2 rounded-xl font-bold ${
                    isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 font-bold text-white shadow-lg cursor-pointer"
                >
                  Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
