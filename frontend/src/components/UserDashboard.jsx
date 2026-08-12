import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Clock, 
  Upload, 
  FileCheck2,
  Video,
  Presentation,
  CheckCircle2,
  Folder,
  FileText,
  Eye,
  Download,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { tasksAPI, rotationAPI, submissionsAPI } from '../api';
import PresentationSubmissionModal from './PresentationSubmissionModal';
import EvidenceUploadModal from './EvidenceUploadModal';

export default function UserDashboard({ user, onOpenSubmitModal, refreshKey }) {
  const [assignments, setAssignments] = useState([]);
  const [rotationSchedules, setRotationSchedules] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedPresentation, setSelectedPresentation] = useState(null);
  const [uploadModalAssignment, setUploadModalAssignment] = useState(null);
  const [activeFolderTask, setActiveFolderTask] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, [refreshKey]);

  const fetchUserData = async () => {
    try {
      const [assignRes, rotationRes, subRes] = await Promise.all([
        tasksAPI.getAssignments(),
        rotationAPI.getSchedules(),
        submissionsAPI.getSubmissions()
      ]);
      setAssignments(assignRes.data);
      setRotationSchedules(rotationRes.data.results || rotationRes.data);
      setSubmissions(subRes.data.results || subRes.data);
    } catch (err) {
      console.error('Failed to load user dashboard data', err);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const pendingAssignments = assignments.filter(a => {
    const isCompletedOrSubmitted = ['PENDING_APPROVAL', 'SUBMITTED', 'APPROVED', 'COMPLETED'].includes(a.status);
    if (isCompletedOrSubmitted) {
      const isDailyRoutine = a.task_details?.is_recurring || a.task_details?.recurrence_type === 'DAILY';
      if (isDailyRoutine) {
        const completedDateStr = a.completed_at 
          ? new Date(a.completed_at).toISOString().split('T')[0]
          : todayStr;
        return completedDateStr !== todayStr;
      }
      return false;
    }
    return true;
  });

  const completedAssignments = assignments.filter(a => a.status === 'APPROVED' || a.status === 'COMPLETED');
  const inReviewAssignments = assignments.filter(a => a.status === 'PENDING_APPROVAL' || a.status === 'SUBMITTED');

  const myUpcomingPresentation = rotationSchedules.find(
    s => s.presenter === user.id && (s.status === 'SCHEDULED' || s.status === 'RESCHEDULED' || s.status === 'REMINDER_SENT')
  );

  const handleDownloadPresigned = async (submissionId) => {
    try {
      const res = await submissionsAPI.getDownloadURL(submissionId);
      if (res.data.download_url) {
        window.open(res.data.download_url, '_blank');
      }
    } catch (err) {
      alert('Failed to generate presigned download URL');
    }
  };

  const handleDeleteEvidence = async (submissionId) => {
    if (!window.confirm('Are you sure you want to delete this uploaded evidence file?')) return;
    try {
      await submissionsAPI.deleteEvidence(submissionId);
      fetchUserData();
    } catch (err) {
      alert('Failed to delete evidence file.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="glass-card rounded-3xl p-6 bg-slate-800 border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400">AWS S3 Evidence Portal</span>
          <h2 className="text-2xl font-black text-white mt-1">{user?.full_name} ({user?.username})</h2>
          <p className="text-xs text-slate-300 mt-1">S3 Bucket: <code className="text-teal-400 font-mono">agilisium-task-portal-evidence</code> • Key Prefix: <code className="text-teal-400 font-mono">users/{user?.username}/</code></p>
        </div>
      </div>

      {/* Upcoming Presentation Banner */}
      {myUpcomingPresentation && (
        <div className="glass-card rounded-3xl p-6 bg-slate-800 border-2 border-purple-500/50 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center shrink-0">
              <Presentation className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">My Upcoming Presentation</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  ⏰ Scheduled on {myUpcomingPresentation.scheduled_date}
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-white mt-1">{myUpcomingPresentation.topic || 'Code Review Session'}</h3>
              {myUpcomingPresentation.meeting_link && (
                <a href={myUpcomingPresentation.meeting_link} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline flex items-center gap-1.5 mt-1 font-medium">
                  <Video className="w-3.5 h-3.5" />
                  <span>Join Microsoft Teams Session</span>
                </a>
              )}
            </div>
          </div>

          <button
            onClick={() => setSelectedPresentation(myUpcomingPresentation)}
            className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xl flex items-center gap-2 cursor-pointer transition shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Submit Presentation Evidence</span>
          </button>
        </div>
      )}

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-amber-400">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Action Tasks</span>
          <p className="text-3xl font-extrabold text-white mt-2">{pendingAssignments.length}</p>
          <p className="text-[11px] text-amber-300 mt-1">Awaiting S3 Evidence Upload</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-teal-400">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Submitted / Under Review</span>
          <p className="text-3xl font-extrabold text-white mt-2">{inReviewAssignments.length}</p>
          <p className="text-[11px] text-teal-300 mt-1">S3 Files Stored</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-emerald-400">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Tasks</span>
          <p className="text-3xl font-extrabold text-white mt-2">{completedAssignments.length}</p>
          <p className="text-[11px] text-emerald-300 mt-1">Approved & Verified</p>
        </div>
      </div>

      {/* 📁 Core Tasks Evidence Folders View */}
      <div className="glass-card rounded-2xl p-6 bg-slate-900 border border-slate-800">
        <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-teal-400" />
            <span>My Core Task Evidence Folders</span>
          </span>
          <span className="text-xs font-medium text-slate-400">AWS S3 Path: users/{user?.username}/</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((assignment) => {
            const task = assignment.task_details || assignment.task;
            const taskSubmissions = submissions.filter(s => s.assignment === assignment.id || s.assignment_details?.id === assignment.id);
            const isCompleted = ['APPROVED', 'COMPLETED'].includes(assignment.status);

            return (
              <div
                key={assignment.id}
                className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-teal-500/60 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Folder className="w-6 h-6 text-amber-400" />
                      <span className="text-xs font-extrabold text-white truncate max-w-[160px]">{task?.title}</span>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      isCompleted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      assignment.status === 'PENDING_APPROVAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                    }`}>
                      {assignment.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2">{task?.description}</p>
                  
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Evidence Files: <strong className="text-teal-400">{taskSubmissions.length} files</strong></span>
                    <span>Format: <strong className="text-white">{task?.allowed_format || 'ANY'}</strong></span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  {taskSubmissions.length > 0 && (
                    <button
                      onClick={() => setActiveFolderTask({ assignment, taskSubmissions })}
                      className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-teal-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Files ({taskSubmissions.length})</span>
                    </button>
                  )}

                  <button
                    onClick={() => setUploadModalAssignment(assignment)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-md cursor-pointer transition ml-auto"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload to S3</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Evidence Files Drawer Modal */}
      {activeFolderTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl p-6 bg-[#09222f] border border-[#144052] text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Folder className="w-6 h-6 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold">{activeFolderTask.assignment.task_details?.title}</h3>
                  <p className="text-xs text-slate-400">Canonical Path: <code className="text-teal-400 font-mono">users/{user?.username}/...</code></p>
                </div>
              </div>

              <button
                onClick={() => setActiveFolderTask(null)}
                className="px-3 py-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {activeFolderTask.taskSubmissions.map((sub) => (
                <div key={sub.id} className="p-3.5 rounded-xl bg-[#061b27] border border-[#18485e] flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="w-5 h-5 text-teal-400 shrink-0" />
                    <div className="truncate">
                      <p className="font-bold truncate text-white">{sub.file_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">S3 Key: {sub.s3_key || 'Uploaded'}</p>
                      <p className="text-[10px] text-slate-500">
                        Uploaded on {new Date(sub.submitted_at).toLocaleDateString()} • {(sub.file_size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDownloadPresigned(sub.id)}
                      className="px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>

                    <button
                      onClick={() => handleDeleteEvidence(sub.id)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 transition cursor-pointer"
                      title="Delete Evidence"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Direct AWS S3 Presigned Upload Modal */}
      {uploadModalAssignment && (
        <EvidenceUploadModal
          assignment={uploadModalAssignment}
          isOpen={!!uploadModalAssignment}
          onClose={() => setUploadModalAssignment(null)}
          onSuccess={() => {
            setUploadModalAssignment(null);
            fetchUserData();
          }}
          theme="dark"
        />
      )}

      {/* Presentation Evidence Modal */}
      {selectedPresentation && (
        <PresentationSubmissionModal
          schedule={selectedPresentation}
          onClose={() => setSelectedPresentation(null)}
          onSuccess={() => {
            setSelectedPresentation(null);
            fetchUserData();
          }}
        />
      )}
    </div>
  );
}
