import React, { useState, useEffect } from 'react';
import GlassSidebar from './components/GlassSidebar';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import TaskWorkspace from './components/TaskWorkspace';
import PresentationRotationWorkspace from './components/PresentationRotationWorkspace';
import AdminApprovalHub from './components/AdminApprovalHub';
import DefaultersReportsView from './components/DefaultersReportsView';
import StorageAnalyticsView from './components/StorageAnalyticsView';
import ActivityLogsView from './components/ActivityLogsView';
import LuckySpinWheel from './components/LuckySpinWheel';
import SubmissionDrawer from './components/SubmissionDrawer';
import { authAPI } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBatch, setSelectedBatch] = useState('1');
  const [selectedAssignmentForSubmit, setSelectedAssignmentForSubmit] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    checkAuth();
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const res = await authAPI.getProfile();
        setUser(res.data);
      } catch (err) {
        localStorage.removeItem('access_token');
        setUser(null);
      }
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#051923] text-[#56e3ce] font-bold text-sm">
        Loading Agilisium Task Portal...
      </div>
    );
  }

  if (!user) {
    return <LoginModal onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className={`flex flex-col min-h-screen ${theme === 'light' ? 'theme-light bg-slate-100 text-slate-900' : 'theme-dark bg-[#051923] text-slate-100'} font-sans selection:bg-[#0a9396] selection:text-white transition-colors duration-300`}>
      {/* Top Horizontal Navbar */}
      <Navbar
        user={user}
        selectedBatch={selectedBatch}
        setSelectedBatch={setSelectedBatch}
        onLogout={handleLogout}
        onOpenWheel={() => setActiveTab('wheel')}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <GlassSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          onLogout={handleLogout}
          theme={theme}
        />

        {/* Main Workspace Content */}
        <main className="flex-1 p-8 overflow-y-auto min-w-0">
          {activeTab === 'dashboard' && (
            user.role !== 'USER' ? (
              <AdminDashboard onNavigate={setActiveTab} theme={theme} />
            ) : (
              <UserDashboard
                user={user}
                refreshKey={refreshKey}
                onOpenSubmitModal={(assign) => setSelectedAssignmentForSubmit(assign)}
                theme={theme}
              />
            )
          )}

          {activeTab === 'wheel' && (
            <LuckySpinWheel theme={theme} />
          )}

          {activeTab === 'tasks' && (
            <TaskWorkspace
              user={user}
              refreshKey={refreshKey}
              onOpenSubmitModal={(assign) => setSelectedAssignmentForSubmit(assign)}
              theme={theme}
            />
          )}

          {activeTab === 'rotation' && (
            <PresentationRotationWorkspace user={user} theme={theme} />
          )}

          {activeTab === 'submissions' && (
            <AdminApprovalHub user={user} theme={theme} />
          )}

          {activeTab === 'storage' && (
            <StorageAnalyticsView theme={theme} />
          )}

          {activeTab === 'defaulters' && (
            <DefaultersReportsView theme={theme} />
          )}

          {activeTab === 'logs' && (
            <ActivityLogsView theme={theme} />
          )}
        </main>
      </div>

      {/* Evidence Submission Modal */}
      {selectedAssignmentForSubmit && (
        <SubmissionDrawer
          assignment={selectedAssignmentForSubmit}
          onClose={() => setSelectedAssignmentForSubmit(null)}
          onSuccess={() => {
            setSelectedAssignmentForSubmit(null);
            setRefreshKey(prev => prev + 1);
          }}
          theme={theme}
        />
      )}
    </div>
  );
}
