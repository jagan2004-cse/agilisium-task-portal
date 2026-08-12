import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Clock, 
  Upload, 
  FileCheck2,
  Video,
  Presentation,
  CheckCircle2
} from 'lucide-react';
import { tasksAPI, rotationAPI } from '../api';
import PresentationSubmissionModal from './PresentationSubmissionModal';

export default function UserDashboard({ user, onOpenSubmitModal, refreshKey }) {
  const [assignments, setAssignments] = useState([]);
  const [rotationSchedules, setRotationSchedules] = useState([]);
  const [selectedPresentation, setSelectedPresentation] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, [refreshKey]);

  const fetchUserData = async () => {
    try {
      const [assignRes, rotationRes] = await Promise.all([
        tasksAPI.getAssignments(),
        rotationAPI.getSchedules()
      ]);
      setAssignments(assignRes.data);
      setRotationSchedules(rotationRes.data.results || rotationRes.data);
    } catch (err) {
      console.error('Failed to load user dashboard data', err);
    }
  };

  // Filter tasks: Pending list ONLY shows tasks awaiting evidence submission!
  // For Daily Routine tasks, if submitted today, remove from pending list for rest of today; re-appears at 12:00 AM Midnight!
  const todayStr = new Date().toISOString().split('T')[0];

  const pendingAssignments = assignments.filter(a => {
    const isCompletedOrSubmitted = ['PENDING_APPROVAL', 'SUBMITTED', 'APPROVED', 'COMPLETED'].includes(a.status);
    if (isCompletedOrSubmitted) {
      const isDailyRoutine = a.task_details?.is_recurring || a.task_details?.recurrence_type === 'DAILY';
      if (isDailyRoutine) {
        const completedDateStr = a.completed_at 
          ? new Date(a.completed_at).toISOString().split('T')[0]
          : todayStr;
        // If submitted today, hide for rest of today; re-appears automatically at 12:00 AM Midnight tomorrow
        return completedDateStr !== todayStr;
      }
      return false;
    }
    return true;
  });

  const completedAssignments = assignments.filter(a => a.status === 'APPROVED' || a.status === 'COMPLETED');
  const inReviewAssignments = assignments.filter(a => a.status === 'PENDING_APPROVAL' || a.status === 'SUBMITTED');

  // Find logged-in user's upcoming presentation
  const myUpcomingPresentation = rotationSchedules.find(
    s => s.presenter === user.id && (s.status === 'SCHEDULED' || s.status === 'RESCHEDULED' || s.status === 'REMINDER_SENT')
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="glass-card rounded-3xl p-6 bg-slate-800 border border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Welcome Back</span>
          <h2 className="text-2xl font-bold text-white mt-1">{user?.full_name}</h2>
          <p className="text-xs text-slate-300 mt-1">Agilisium Batch Engineer • Data Engineering & AI</p>
        </div>
      </div>

      {/* MY UPCOMING PRESENTATION BANNER CARD */}
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
          <p className="text-[11px] text-amber-300 mt-1">Awaiting Evidence Upload</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-cyan-400">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Submitted / Under Review</span>
          <p className="text-3xl font-extrabold text-white mt-2">{inReviewAssignments.length}</p>
          <p className="text-[11px] text-cyan-300 mt-1">Evidence Submitted</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-emerald-400">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Tasks</span>
          <p className="text-3xl font-extrabold text-white mt-2">{completedAssignments.length}</p>
          <p className="text-[11px] text-emerald-300 mt-1">Approved & Verified</p>
        </div>
      </div>

      {/* Assigned Tasks Matrix - ONLY SHOW PENDING UN-SUBMITTED TASKS */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-cyan-400" />
            <span>Pending Assigned Tasks ({pendingAssignments.length})</span>
          </span>
          <span className="text-xs font-medium text-slate-400">Tasks disappear automatically upon evidence submission</span>
        </h3>

        {pendingAssignments.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-700 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">All Caught Up! 🎉</h4>
            <p className="text-xs text-slate-400">You have no pending assigned tasks awaiting submission. Submitted tasks can be viewed under "My Submissions".</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingAssignments.map((assignment) => {
              const task = assignment.task_details;

              return (
                <div key={assignment.id} className="p-4 rounded-xl glass-card bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{task?.title}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        task?.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        task?.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                      }`}>
                        {task?.priority}
                      </span>
                      {(task?.is_recurring || task?.recurrence_type === 'DAILY') && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                          🔁 Daily Routine (Resets at 12:00 AM)
                        </span>
                      )}
                      {task?.approval_required ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          Requires Approval
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          Auto-Complete
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{task?.description}</p>
                    <p className="text-xs font-bold text-slate-200 mt-1">
                      Due Date: <span className="text-cyan-300 font-extrabold">{task?.due_date} at {task?.due_time}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onOpenSubmitModal(assignment)}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Evidence</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
