import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  RefreshCw, 
  UploadCloud, 
  HardDrive, 
  AlertTriangle, 
  History,
  LogOut,
  Dices,
  BookOpen
} from 'lucide-react';

export default function GlassSidebar({ activeTab, setActiveTab, user, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'wheel', label: 'Lucky Spin Wheel', icon: Dices },
    { id: 'tasks', label: 'Task Workspace', icon: CheckSquare },
    { id: 'rotation', label: 'Code Review Tracker', icon: BookOpen },
    { id: 'submissions', label: user?.role !== 'USER' ? 'Submissions and Approvals' : 'My Submissions', icon: UploadCloud },
    { id: 'storage', label: 'Storage & Files', icon: HardDrive },
    { id: 'defaulters', label: 'Defaulters & Reports', icon: AlertTriangle, adminOnly: true },
    { id: 'logs', label: 'Audit Logs', icon: History, adminOnly: true },
  ];

  return (
    <aside className="w-64 glass-navbar h-[calc(100vh-65px)] sticky top-[65px] flex flex-col justify-between p-4 z-20 border-r border-slate-700 bg-slate-800">
      {/* Navigation Menu */}
      <nav className="space-y-1.5 overflow-y-auto pr-1">
        {menuItems.map((item) => {
          if (item.adminOnly && user?.role === 'USER') return null;
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <button
        onClick={onLogout}
        className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-all duration-200 w-full cursor-pointer mt-4"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </button>
    </aside>
  );
}
