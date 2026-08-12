import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  UserPlus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  RotateCcw, 
  History, 
  AlertTriangle, 
  X, 
  FileCode, 
  BookOpen, 
  ChevronRight, 
  Award,
  Sparkles,
  Users,
  CheckSquare,
  Layers
} from 'lucide-react';
import { codeReviewAPI } from '../api';

export default function PresentationRotationWorkspace({ user, theme = localStorage.getItem('theme') || 'dark' }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [membersStatus, setMembersStatus] = useState([]);
  const [cycleHistory, setCycleHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today'); // 'today', 'members', 'daily', 'cycles'
  const [searchQuery, setSearchQuery] = useState('');
  const isLight = theme === 'light';

  // Single Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [programName, setProgramName] = useState('');
  const [notes, setNotes] = useState('');
  const [explanationDate, setExplanationDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Bulk Seed Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState([]);
  const [bulkProgramName, setBulkProgramName] = useState('Code Review Task');
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Undo Modal State
  const [undoItem, setUndoItem] = useState(null);
  const [undoing, setUndoing] = useState(false);

  // Member History Modal State
  const [selectedMemberHistory, setSelectedMemberHistory] = useState(null);
  const [memberHistoryLoading, setMemberHistoryLoading] = useState(false);

  // Cycle Auto-Advanced Banner
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, membersRes, historyRes] = await Promise.all([
        codeReviewAPI.getDashboard(),
        codeReviewAPI.getMembersStatus(),
        codeReviewAPI.getCycleHistory()
      ]);
      setDashboardData(dashRes.data);
      setMembersStatus(membersRes.data.members || []);
      setCycleHistory(historyRes.data || []);
    } catch (err) {
      console.error('Failed to load code review dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  // Single Mark Completed Handler
  const handleMarkCompleted = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setErrorMessage('Please select a batch member.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const res = await codeReviewAPI.markCompleted({
        member_id: selectedMemberId,
        program_name: programName,
        notes: notes,
        date: explanationDate
      });

      setShowAddModal(false);
      setSelectedMemberId('');
      setProgramName('');
      setNotes('');
      setMemberSearchQuery('');

      if (res.data.cycle_auto_advanced) {
        setAutoAdvanceNotice({
          new_cycle: res.data.new_cycle_number
        });
      }

      fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.detail || 'Failed to mark member as completed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk Seed Handler
  const handleBulkSeed = async (e) => {
    e.preventDefault();
    if (bulkSelectedIds.length === 0) {
      alert('Please select at least one pending member to seed.');
      return;
    }

    setBulkSubmitting(true);
    try {
      const res = await codeReviewAPI.bulkSeed({
        member_ids: bulkSelectedIds,
        program_name: bulkProgramName,
        date: bulkDate
      });

      setShowBulkModal(false);
      setBulkSelectedIds([]);

      if (res.data.cycle_auto_advanced) {
        setAutoAdvanceNotice({
          new_cycle: res.data.new_cycle_number
        });
      }

      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to bulk seed members.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Undo Handler
  const handleConfirmUndo = async () => {
    if (!undoItem) return;
    setUndoing(true);
    try {
      await codeReviewAPI.undoCompletion(undoItem.explanation_id);
      setUndoItem(null);
      fetchData();
    } catch (err) {
      console.error('Failed to undo completion', err);
    } finally {
      setUndoing(false);
    }
  };

  const handleViewMemberHistory = async (memberId) => {
    setMemberHistoryLoading(true);
    try {
      const res = await codeReviewAPI.getMemberHistory(memberId);
      setSelectedMemberHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch member history', err);
    } finally {
      setMemberHistoryLoading(false);
    }
  };

  const toggleBulkSelectAll = () => {
    const pendingMembers = membersStatus.filter(m => !m.is_completed);
    if (bulkSelectedIds.length === pendingMembers.length) {
      setBulkSelectedIds([]);
    } else {
      setBulkSelectedIds(pendingMembers.map(m => m.id));
    }
  };

  const toggleBulkSelectMember = (id) => {
    if (bulkSelectedIds.includes(id)) {
      setBulkSelectedIds(bulkSelectedIds.filter(item => item !== id));
    } else {
      setBulkSelectedIds([...bulkSelectedIds, id]);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64 text-cyan-400 font-bold text-sm">
        Loading Code Review Cycle Tracker...
      </div>
    );
  }

  const cycle = dashboardData?.cycle || {};
  const totalMembers = dashboardData?.total_members || 27;
  const completedCount = dashboardData?.completed_count || 0;
  const pendingCount = dashboardData?.pending_count || 0;
  const progressPct = dashboardData?.progress_pct || 0;
  const todayCount = dashboardData?.today_completed_count || 0;

  const filteredMembers = membersStatus.filter(m => 
    m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.program_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const eligibleMembersInModal = membersStatus.filter(m => 
    m.full_name.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  const pendingMembersList = membersStatus.filter(m => !m.is_completed);

  return (
    <div className="space-y-6">
      {/* 🌟 Header Banner */}
      <div className={`rounded-3xl p-6 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
      }`}>
        <div>
          <h2 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Data Engineering Code Review Dashboard</h2>
        </div>

        {user?.role !== 'USER' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setErrorMessage('');
                setShowAddModal(true);
              }}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs border flex items-center gap-2 cursor-pointer transition ${
                isLight ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200' : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600'
              }`}
            >
              <UserPlus className="w-4 h-4 text-cyan-600" />
              <span>+ Insert One-by-One</span>
            </button>

            <button
              onClick={() => {
                setBulkSelectedIds(pendingMembersList.map(m => m.id));
                setShowBulkModal(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer transition"
            >
              <Layers className="w-4 h-4" />
              <span>⚡ Bulk Seed Members</span>
            </button>
          </div>
        )}
      </div>

      {/* 📊 KPI Summary Matrix Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border-l-4 border-teal-500 border transition-all ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Total Batch Members</span>
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <p className={`text-3xl font-extrabold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalMembers}</p>
          <p className="text-[11px] text-teal-700 font-semibold mt-1">Data Engineering & AI Batch</p>
        </div>

        <div className={`p-5 rounded-2xl border-l-4 border-emerald-500 border transition-all ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Completed Explanations</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className={`text-3xl font-extrabold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{completedCount}</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">Finished in Cycle #{cycle.cycle_number || 1}</p>
        </div>

        <div className={`p-5 rounded-2xl border-l-4 border-amber-500 border transition-all ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Pending Members</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className={`text-3xl font-extrabold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{pendingCount}</p>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">Remaining for Cycle Completion</p>
        </div>

        <div className={`p-5 rounded-2xl border-l-4 border-purple-500 border transition-all ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Cycle Progress</span>
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <p className={`text-3xl font-extrabold mt-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>{progressPct}%</p>
          <div className={`w-full h-2 rounded-full mt-2 overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`}>
            <div 
              className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* ⚡ Today's Highlights Summary Strip */}
      <div className={`rounded-2xl p-4 border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            isLight ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
          }`}>
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className={`text-[11px] font-semibold uppercase tracking-wider block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Today's Summary</span>
            <p className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <span className="text-teal-700 font-extrabold">{todayCount} members</span> completed code explanations today
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Today's Done: {todayCount}</span>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/30 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Remaining in Cycle: {pendingCount}</span>
          </span>
        </div>
      </div>

      {/* 🧭 Tabs Navigation & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-700 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'today'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Today's Explanations ({dashboardData?.today_explanations?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'members'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All Members ({membersStatus.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Daily History</span>
          </button>

          <button
            onClick={() => setActiveTab('cycles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'cycles'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Cycle History</span>
          </button>
        </div>
      </div>

      {/* 📋 TAB 1: Today's Explanations */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          {(!dashboardData?.today_explanations || dashboardData.today_explanations.length === 0) ? (
            <div className="glass-card p-12 text-center rounded-2xl border border-slate-700 bg-slate-900/40">
              <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No code explanations recorded today yet</h3>
              <p className="text-xs text-slate-400 mt-1">
                Click "+ Insert One-by-One" or "⚡ Bulk Seed Members" above to record members who explain their programs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData.today_explanations.map((exp) => (
                <div key={exp.id} className="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-slate-800/90 relative group hover:border-emerald-400 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-sm flex items-center justify-center border border-emerald-500/40">
                        {exp.member_details?.first_name?.[0] || 'U'}
                      </div>
                      <div>
                        <button
                          onClick={() => handleViewMemberHistory(exp.member)}
                          className="text-sm font-bold text-white hover:text-cyan-300 text-left transition cursor-pointer"
                        >
                          {exp.member_details?.full_name || 'Member'}
                        </button>
                        <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed Today
                        </span>
                      </div>
                    </div>

                    {user?.role !== 'USER' && (
                      <button
                        onClick={() => setUndoItem({ explanation_id: exp.id, member_name: exp.member_details?.full_name })}
                        className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                        title="Undo Completion"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-1.5">
                    {exp.program_name && (
                      <div className="flex items-center gap-2 text-xs">
                        <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="text-slate-200 font-medium truncate">{exp.program_name}</span>
                      </div>
                    )}
                    {exp.notes && (
                      <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50 italic">
                        "{exp.notes}"
                      </p>
                    )}
                    <div className="text-[10px] text-slate-500 text-right pt-1">
                      Recorded by {exp.created_by_name || 'Admin'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 👥 TAB 2: All Members List */}
      {activeTab === 'members' && (
        <div className={`rounded-2xl border overflow-hidden transition-all ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`text-[11px] uppercase tracking-wider border-b ${
                isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#061b27] text-slate-400 border-[#18485e]'
              }`}>
                <tr>
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">Member Name</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Current Cycle</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Completed Program</th>
                  <th className="py-3.5 px-4">Completion Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800'}`}>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={`py-8 text-center font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      No matching batch members found.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m, idx) => (
                    <tr key={m.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}>
                      <td className={`py-3.5 px-4 font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleViewMemberHistory(m.id)}
                          className={`font-bold transition text-left cursor-pointer ${
                            isLight ? 'text-slate-900 hover:text-teal-700' : 'text-white hover:text-cyan-300'
                          }`}
                        >
                          {m.full_name}
                        </button>
                      </td>
                      <td className={`py-3.5 px-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{m.email}</td>
                      <td className={`py-3.5 px-4 font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>Cycle {cycle.cycle_number || 1}</td>
                      <td className="py-3.5 px-4">
                        {m.is_completed ? (
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
                            isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> ✓ Completed
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
                            isLight ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            <Clock className="w-3.5 h-3.5" /> ○ Pending
                          </span>
                        )}
                      </td>
                      <td className={`py-3.5 px-4 font-medium ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                        {m.program_name || '—'}
                      </td>
                      <td className={`py-3.5 px-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {m.completed_date || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!m.is_completed && user?.role !== 'USER' && (
                            <button
                              onClick={() => {
                                setSelectedMemberId(m.id);
                                setShowAddModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-[11px] transition cursor-pointer shadow-sm"
                            >
                              + Insert
                            </button>
                          )}
                          <button
                            onClick={() => handleViewMemberHistory(m.id)}
                            className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] border transition cursor-pointer ${
                              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' : 'bg-[#061b27] hover:bg-slate-700 text-cyan-400 border-[#18485e]'
                            }`}
                          >
                            History
                          </button>
                          {m.is_completed && user?.role !== 'USER' && (
                            <button
                              onClick={() => setUndoItem({ explanation_id: m.explanation_id, member_name: m.full_name })}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-semibold text-[11px] border border-rose-500/30 transition cursor-pointer"
                            >
                              Undo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 📅 TAB 3: Daily History */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {(!dashboardData?.daily_history || dashboardData.daily_history.length === 0) ? (
            <div className={`p-12 text-center rounded-2xl border ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
            }`}>
              <Calendar className={`w-12 h-12 mx-auto mb-3 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>No daily explanation history recorded yet</h3>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Explanations will automatically be grouped by date here as they are added.</p>
            </div>
          ) : (
            dashboardData.daily_history.map((dayGroup) => (
              <div key={dayGroup.date} className={`rounded-2xl p-5 border space-y-4 transition-all ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
              }`}>
                <div className={`flex items-center justify-between border-b pb-3 ${
                  isLight ? 'border-slate-200' : 'border-[#18485e]'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{dayGroup.date}</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-500/30">
                    {dayGroup.completed_count} Members Completed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {dayGroup.explanations.map((exp) => (
                    <div key={exp.id} className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-xs' : 'bg-[#061b27] border-[#18485e] text-white'
                    }`}>
                      <div>
                        <p className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{exp.member_details?.full_name}</span>
                        </p>
                        {exp.program_name && (
                          <p className="text-[11px] text-teal-700 font-bold mt-1 truncate">
                            {exp.program_name}
                          </p>
                        )}
                        {exp.notes && (
                          <p className={`text-[10px] mt-0.5 line-clamp-2 italic ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                            "{exp.notes}"
                          </p>
                        )}
                      </div>

                      {user?.role !== 'USER' && (
                        <button
                          onClick={() => setUndoItem({ explanation_id: exp.id, member_name: exp.member_details?.full_name })}
                          className="text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          title="Undo"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 📜 TAB 4: Cycle History */}
      {activeTab === 'cycles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cycleHistory.map((c) => (
            <div key={c.id} className={`p-5 rounded-2xl border space-y-4 transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#09222f] border-[#144052]'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Review Cycle</span>
                  <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Cycle #{c.cycle_number}</h3>
                </div>
                {c.status === 'COMPLETED' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-500/40">
                    🎉 Completed
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-700 border border-teal-500/40">
                    ⚡ In Progress
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#061b27] border-[#18485e]'
                }`}>
                  <span className={`text-[10px] block uppercase font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Explanations Finished</span>
                  <p className={`text-base font-extrabold mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {c.completed_count} / {c.total_members}
                  </p>
                </div>
                <div className={`p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#061b27] border-[#18485e]'
                }`}>
                  <span className={`text-[10px] block uppercase font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Start & End Date</span>
                  <p className="text-xs font-bold text-teal-700 mt-1">
                    {c.start_date} {c.end_date ? `— ${c.end_date}` : '(Current)'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ➕ MODAL 1: Insert One-by-One with Name */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card w-full max-w-lg rounded-3xl p-6 bg-slate-900 border border-slate-700 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Insert Member Code Explanation</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleMarkCompleted} className="space-y-4 text-xs">
              {/* Select Member by Name */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Select Member Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Filter name..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 mb-2"
                />
                
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-medium"
                  required
                >
                  <option value="">-- Choose Member Name --</option>
                  {eligibleMembersInModal.map((m) => (
                    <option key={m.id} value={m.id} disabled={m.is_completed}>
                      {m.full_name} {m.is_completed ? ' (✓ Completed in Cycle ' + cycle.cycle_number + ')' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Program Name */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Program / Topic Name <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Employee Management PySpark Task"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Explanation Date</label>
                  <input
                    type="date"
                    value={explanationDate}
                    onChange={(e) => setExplanationDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Notes <span className="text-slate-500 font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Cleared code review"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-bold shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Saving...' : 'Mark Completed'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚡ MODAL 2: Bulk Seed Members */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card w-full max-w-xl rounded-3xl p-6 bg-slate-900 border border-slate-700 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Bulk Seed Members for Cycle #{cycle.cycle_number || 1}</h3>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkSeed} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Program / Topic Title Prefix</label>
                  <input
                    type="text"
                    placeholder="e.g. PySpark & SQL Code Review"
                    value={bulkProgramName}
                    onChange={(e) => setBulkProgramName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Explanation Date</label>
                  <input
                    type="date"
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Members Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-slate-300 font-bold">
                    Select Pending Members to Seed ({bulkSelectedIds.length} / {pendingMembersList.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={toggleBulkSelectAll}
                    className="text-cyan-400 hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    {bulkSelectedIds.length === pendingMembersList.length ? 'Deselect All' : 'Select All Pending'}
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto p-3 rounded-2xl bg-slate-800/80 border border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pendingMembersList.length === 0 ? (
                    <p className="text-slate-400 py-4 col-span-2 text-center">🎉 All members have already completed this cycle!</p>
                  ) : (
                    pendingMembersList.map((m) => (
                      <label
                        key={m.id}
                        className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                          bulkSelectedIds.includes(m.id)
                            ? 'bg-cyan-950/60 border-cyan-500/60 text-white'
                            : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={bulkSelectedIds.includes(m.id)}
                          onChange={() => toggleBulkSelectMember(m.id)}
                          className="w-4 h-4 rounded text-cyan-500 focus:ring-0 accent-cyan-500 cursor-pointer"
                        />
                        <span className="font-semibold truncate">{m.full_name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting || bulkSelectedIds.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                >
                  <Layers className="w-4 h-4" />
                  <span>{bulkSubmitting ? 'Seeding...' : `Bulk Seed ${bulkSelectedIds.length} Members`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL 3: Confirm Undo Modal */}
      {undoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card w-full max-w-md rounded-3xl p-6 bg-slate-900 border border-rose-500/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center border border-rose-500/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Undo Completion</h3>
                <p className="text-xs text-slate-400 mt-0.5">Cycle #{cycle.cycle_number || 1}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to undo the code explanation completion for <strong className="text-white">{undoItem.member_name}</strong>?
              This will return their status to <span className="text-amber-300 font-bold">Pending</span> for the current cycle.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setUndoItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUndo}
                disabled={undoing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-rose-500/20"
              >
                {undoing ? 'Undoing...' : 'Confirm Undo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👤 MODAL 4: Member History Modal */}
      {selectedMemberHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card w-full max-w-lg rounded-3xl p-6 bg-slate-900 border border-slate-700 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Member Participation History</span>
                <h3 className="text-lg font-bold text-white">{selectedMemberHistory.member?.full_name}</h3>
                <p className="text-xs text-slate-400">{selectedMemberHistory.member?.email}</p>
              </div>
              <button
                onClick={() => setSelectedMemberHistory(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {selectedMemberHistory.history?.map((h) => (
                <div key={h.cycle_id} className="p-3.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white text-sm">Cycle #{h.cycle_number}</span>
                    {h.program_name && (
                      <p className="text-cyan-300 font-medium mt-0.5">{h.program_name}</p>
                    )}
                    {h.explanation_date && (
                      <p className="text-[11px] text-slate-400 mt-0.5">Completed on {h.explanation_date}</p>
                    )}
                  </div>

                  <div>
                    {h.is_completed ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🎉 MODAL 5: Automatic New Cycle Celebration Banner */}
      {autoAdvanceNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-card w-full max-w-md rounded-3xl p-6 bg-slate-900 border border-emerald-500/50 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <Sparkles className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-extrabold text-white">🎉 Cycle Completed!</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              All batch members have successfully completed their code explanations!
              The system has automatically closed the current cycle and initiated <strong className="text-cyan-300">Cycle #{autoAdvanceNotice.new_cycle}</strong> with all members ready for their next review round.
            </p>

            <button
              onClick={() => setAutoAdvanceNotice(null)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 cursor-pointer transition w-full"
            >
              Continue to Cycle #{autoAdvanceNotice.new_cycle} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
