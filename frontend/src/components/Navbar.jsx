import React, { useState, useEffect } from 'react';
import { Bell, Dices, FolderPlus, ChevronDown, Check, X } from 'lucide-react';
import { notificationsAPI, authAPI } from '../api';

export default function Navbar({ user, selectedBatch, setSelectedBatch, onLogout, onOpenWheel }) {
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [batches, setBatches] = useState([]);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');
  const [loadingBatch, setLoadingBatch] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchBatches();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getNotifications();
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await authAPI.getBatches();
      const loaded = res.data.results || res.data;
      setBatches(loaded);
      if (loaded.length > 0 && !selectedBatch) {
        setSelectedBatch(loaded[0].id);
      }
    } catch (err) {
      console.error('Failed to load batches', err);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!newBatchName) return;
    setLoadingBatch(true);
    try {
      const res = await authAPI.createBatch({
        name: newBatchName,
        description: newBatchDesc
      });
      setShowNewBatchModal(false);
      setNewBatchName('');
      setNewBatchDesc('');
      await fetchBatches();
      setSelectedBatch(res.data.id);
    } catch (err) {
      console.error('Failed to create new batch', err);
    } finally {
      setLoadingBatch(false);
    }
  };

  const activeBatchObj = batches.find(b => String(b.id) === String(selectedBatch)) || { name: 'Batch 12' };
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="sticky top-0 z-30 glass-navbar px-8 py-3 flex items-center justify-between border-b border-slate-700 bg-slate-800">
      {/* Left Brand & Dynamic Glass Batch Selector */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <img
            src="/agilisium_logo.png"
            alt="Agilisium Logo"
            className="h-12 w-auto object-contain bg-white px-3.5 py-1.5 rounded-2xl shadow-xl border border-slate-700 hover:scale-105 transition shrink-0"
          />
          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-cyan-400 tracking-wider uppercase leading-none">Tracking Automation</h1>
          </div>
        </div>

        {/* Custom Glassmorphism Option Selector */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setShowBatchDropdown(!showBatchDropdown)}
            className="px-4 py-2 rounded-2xl glass-select flex items-center gap-2 text-xs font-extrabold shadow-lg cursor-pointer hover:scale-[1.02] transition border border-cyan-500/50"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span>{activeBatchObj.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {/* Custom Option Dropdown */}
          {showBatchDropdown && (
            <div className="absolute left-0 mt-2 w-64 bg-slate-800 rounded-2xl p-2 shadow-2xl z-50 border border-slate-700 space-y-1">
              <div className="px-3 py-1.5 border-b border-slate-700 text-[10px] uppercase font-bold text-slate-400 flex justify-between items-center">
                <span>Select Active Batch</span>
                {user?.role !== 'USER' && (
                  <button
                    onClick={() => {
                      setShowBatchDropdown(false);
                      setShowNewBatchModal(true);
                    }}
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <FolderPlus className="w-3 h-3" />
                    <span>+ Add New</span>
                  </button>
                )}
              </div>

              {batches.map((b) => {
                const isSelected = String(b.id) === String(selectedBatch);
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBatch(b.id);
                      setShowBatchDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'glass-option-active text-cyan-300'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{b.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right User Controls & Lucky Wheel Launcher */}
      <div className="flex items-center gap-3">
        {/* Lucky Wheel Quick Launcher Button */}
        <button
          onClick={onOpenWheel}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 cursor-pointer transition transform hover:scale-105 border border-cyan-400/40"
        >
          <Dices className="w-4 h-4 text-cyan-200 animate-spin" />
          <span>Lucky Wheel</span>
        </button>

        {/* Notifications Icon & Drawer */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 hover:text-white transition cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-3 w-80 bg-slate-800 rounded-2xl p-4 shadow-2xl z-50 border border-slate-700">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h4>
                {unreadCount > 0 && (
                  <button onClick={() => notificationsAPI.markRead().then(fetchNotifications)} className="text-[10px] text-cyan-400 hover:underline">
                    Mark read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                {notifications.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-2.5 rounded-xl ${n.is_read ? 'bg-slate-700 text-slate-300' : 'bg-cyan-950 border border-cyan-800 text-white'}`}>
                      <p className="font-semibold">{n.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-700 border border-slate-600">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs border border-white/20">
            {user?.first_name?.[0] || 'U'}
          </div>
          <div className="hidden lg:block overflow-hidden">
            <p className="text-xs font-bold text-white leading-tight truncate">{user?.full_name || user?.username}</p>
            <span className="text-[9px] text-cyan-300 font-semibold uppercase">{user?.role?.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Add New Upcoming Batch Modal */}
      {showNewBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
          <div className="w-full max-w-md bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add New Upcoming Batch</h3>
              <button onClick={() => setShowNewBatchModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. Batch 14"
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={newBatchDesc}
                  onChange={(e) => setNewBatchDesc(e.target.value)}
                  placeholder="e.g. Agilisium Data Engineering & AI Batch 14"
                  className="w-full px-3.5 py-2 rounded-xl glass-input text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700">
                <button type="button" onClick={() => setShowNewBatchModal(false)} className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300 font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={loadingBatch} className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white shadow-lg">
                  {loadingBatch ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
