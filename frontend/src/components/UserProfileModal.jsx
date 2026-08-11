import React, { useState } from 'react';
import { User, Mail, Building, ShieldCheck, CheckCircle2, X, Edit2, Save, RefreshCw } from 'lucide-react';
import { authAPI } from '../api';

export default function UserProfileModal({ isOpen, onClose, user, onUpdateUser, theme = 'dark' }) {
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [middleName, setMiddleName] = useState(user?.middle_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen || !user) return null;

  const isLight = theme === 'light';

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await authAPI.updateProfile({
        first_name: firstName.trim(),
        middle_name: middleName.trim(),
        last_name: lastName.trim()
      });

      if (onUpdateUser) onUpdateUser(res.data);
      setMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setMessage('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className={`w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl relative transition-all ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
      }`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded-lg transition ${
            isLight ? 'text-slate-400 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* User Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            {user.first_name?.[0] || user.username?.[0] || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-extrabold leading-tight">{user.full_name || user.username}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/20 text-teal-700 border border-teal-500/30">
                {user.role}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </span>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 text-xs font-semibold">
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Name Fields */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>First Name</label>
              <input
                type="text"
                value={firstName}
                disabled={!isEditing}
                onChange={(e) => setFirstName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                } ${!isEditing && 'opacity-80 cursor-not-allowed'}`}
              />
            </div>

            <div>
              <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Middle Name</label>
              <input
                type="text"
                value={middleName}
                disabled={!isEditing}
                onChange={(e) => setMiddleName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                } ${!isEditing && 'opacity-80 cursor-not-allowed'}`}
              />
            </div>

            <div>
              <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Last Name</label>
              <input
                type="text"
                value={lastName}
                disabled={!isEditing}
                onChange={(e) => setLastName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'
                } ${!isEditing && 'opacity-80 cursor-not-allowed'}`}
              />
            </div>
          </div>

          {/* Company & Email */}
          <div className="space-y-3 pt-2">
            <div>
              <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Company</label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value="Agilisium"
                  readOnly
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border font-bold ${
                    isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  } cursor-not-allowed`}
                />
              </div>
            </div>

            <div>
              <label className={`block font-bold mb-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Company Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border font-bold ${
                    isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  } cursor-not-allowed`}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-400 border border-slate-300 dark:border-slate-700 font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
