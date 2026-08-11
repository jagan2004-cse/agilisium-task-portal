import React, { useState, useEffect } from 'react';
import { Bell, Dices, FolderPlus, ChevronDown, Check, X, Sun, Moon } from 'lucide-react';
import { notificationsAPI, authAPI } from '../api';
import AgilisiumLogo from './AgilisiumLogo';

export default function Navbar({ user, selectedBatch, setSelectedBatch, onLogout, onOpenWheel, theme, toggleTheme }) {
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
    <header className={`sticky top-0 z-30 px-8 py-3 flex items-center justify-between border-b transition-colors ${
      theme === 'light' ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#051722] border-[#144052] text-white'
    }`}>
      {/* Left Brand & Dynamic Glass Batch Selector */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <AgilisiumLogo size="sm" theme={theme} />
          <div>
            <h1 className={`font-black text-base sm:text-lg tracking-wider uppercase leading-none ${
              theme === 'light' ? 'text-teal-700' : 'text-[#56e3ce]'
            }`}>TASKSPRINT AUTOMATION</h1>
          </div>
        </div>

        {/* Custom Option Selector */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setShowBatchDropdown(!showBatchDropdown)}
            className={`px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-extrabold shadow-lg cursor-pointer hover:scale-[1.02] transition border ${
              theme === 'light' ? 'bg-slate-50 border-teal-600 text-teal-800' : 'bg-[#061b27] border-[#56e3ce]/50 text-[#56e3ce]'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full animate-ping ${
              theme === 'light' ? 'bg-teal-600' : 'bg-[#56e3ce]'
            }`} />
            <span>{activeBatchObj.name}</span>
            <ChevronDown className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-teal-700' : 'text-[#56e3ce]'}`} />
          </button>

          {/* Custom Option Dropdown */}
          {showBatchDropdown && (
            <div className={`absolute left-0 mt-2 w-64 rounded-2xl p-2 shadow-2xl z-50 border space-y-1 ${
              theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#09222f] border-[#144052] text-white'
            }`}>
              <div className={`px-3 py-1.5 border-b text-[10px] uppercase font-bold flex justify-between items-center ${
                theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-[#144052] text-[#94d2bd]'
              }`}>
                <span>Select Active Batch</span>
                {user?.role !== 'USER' && (
                  <button
                    onClick={() => {
                      setShowBatchDropdown(false);
                      setShowNewBatchModal(true);
                    }}
                    className={`hover:underline flex items-center gap-1 font-bold ${
                      theme === 'light' ? 'text-teal-600' : 'text-[#56e3ce]'
                    }`}
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
                        ? (theme === 'light' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'glass-option-active text-[#56e3ce]')
                        : (theme === 'light' ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-[#0d2836] hover:text-white')
                    }`}
                  >
                    <span>{b.name}</span>
                    {isSelected && <Check className={`w-4 h-4 ${theme === 'light' ? 'text-teal-600' : 'text-[#56e3ce]'}`} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right User Controls & Theme Switcher */}
      <div className="flex items-center gap-3">
        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
            theme === 'light'
              ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              : 'bg-[#09222f] border-[#144052] text-[#56e3ce] hover:bg-[#0d2836]'
          }`}
          title="Toggle Light / Dark Theme"
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="text-slate-800 font-bold">Dark Theme</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="text-[#56e3ce] font-bold">White Theme</span>
            </>
          )}
        </button>

        {/* Lucky Wheel Quick Launcher Button */}
        <button
          onClick={onOpenWheel}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#005f73] to-[#0a9396] hover:from-[#0a9396] hover:to-[#94d2bd] text-white text-xs font-black shadow-lg shadow-[#0a9396]/20 flex items-center gap-1.5 cursor-pointer transition transform hover:scale-105 border border-[#56e3ce]/40"
        >
          <Dices className="w-4 h-4 text-[#56e3ce] animate-spin" />
          <span>Lucky Wheel</span>
        </button>

        {/* Notifications Icon & Drawer */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className={`p-2 rounded-xl border transition cursor-pointer relative ${
              theme === 'light'
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                : 'bg-[#09222f] border-[#144052] text-slate-300 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className={`absolute right-0 mt-3 w-80 rounded-2xl p-4 shadow-2xl z-50 border ${
              theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#09222f] border-[#144052] text-white'
            }`}>
              <div className={`flex items-center justify-between mb-2 pb-2 border-b ${
                theme === 'light' ? 'border-slate-200' : 'border-[#144052]'
              }`}>
                <h4 className="text-xs font-bold uppercase tracking-wider">Notifications</h4>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={() => notificationsAPI.markRead().then(fetchNotifications)} className={`text-[10px] font-bold hover:underline ${
                      theme === 'light' ? 'text-teal-600' : 'text-[#56e3ce]'
                    }`}>
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifs(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Close Notifications"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                {notifications.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-2.5 rounded-xl ${
                      n.is_read
                        ? (theme === 'light' ? 'bg-slate-100 text-slate-700' : 'bg-[#061b27] text-slate-300')
                        : (theme === 'light' ? 'bg-teal-50 border border-teal-200 text-teal-900' : 'bg-[#005f73]/40 border border-[#56e3ce]/40 text-white')
                    }`}>
                      <p className="font-semibold">{n.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition ${
          theme === 'light'
            ? 'bg-slate-100 border-slate-300 text-slate-900'
            : 'bg-[#09222f] border-[#144052] text-white'
        }`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#005f73] to-[#0a9396] text-white flex items-center justify-center font-black text-xs border border-white/20">
            {user?.first_name?.[0] || 'U'}
          </div>
          <div className="hidden lg:block overflow-hidden">
            <p className={`text-xs font-bold leading-tight truncate ${
              theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>{user?.full_name || user?.username}</p>
            <span className={`text-[9px] font-semibold uppercase ${
              theme === 'light' ? 'text-teal-700' : 'text-[#56e3ce]'
            }`}>{user?.role?.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Add New Upcoming Batch Modal */}
      {showNewBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
          <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 text-xs ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#09222f] border-[#144052] text-white'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Add New Upcoming Batch</h3>
              <button onClick={() => setShowNewBatchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. Batch 14"
                  className="w-full px-3.5 py-2 rounded-xl glass-input outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  rows="3"
                  value={newBatchDesc}
                  onChange={(e) => setNewBatchDesc(e.target.value)}
                  placeholder="e.g. Agilisium Data Engineering & AI Batch 14"
                  className="w-full px-3.5 py-2 rounded-xl glass-input outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowNewBatchModal(false)} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={loadingBatch} className="px-5 py-2 rounded-xl bg-[#005f73] hover:bg-[#0a9396] font-bold text-white shadow-lg">
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
