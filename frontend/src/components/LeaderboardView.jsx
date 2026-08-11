import React, { useState, useEffect } from 'react';
import { Award, Flame, Trophy, Star, ShieldAlert } from 'lucide-react';
import { leaderboardAPI } from '../api';

export default function LeaderboardView() {
  const [rankings, setRankings] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await leaderboardAPI.getLeaderboard();
      setRankings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Gamified Batch Leaderboard</h2>
        <p className="text-xs text-slate-300 mt-1">Ranking 25 Agilisium batch engineers based on points, presentation streaks & punctuality</p>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card rounded-2xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10 pb-3">
              <tr>
                <th className="pb-3 px-3">Rank</th>
                <th className="pb-3 px-3">Engineer Name</th>
                <th className="pb-3 px-3">Email</th>
                <th className="pb-3 px-3">Streak Flame</th>
                <th className="pb-3 px-3">Points Earned</th>
                <th className="pb-3 px-3">Badge Honor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rankings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">Loading rankings...</td>
                </tr>
              ) : (
                rankings.map((user) => (
                  <tr key={user.user_id} className={`hover:bg-white/5 transition ${user.rank === 1 ? 'bg-amber-500/10' : ''}`}>
                    <td className="py-3.5 px-3 font-extrabold text-sm">
                      {user.rank === 1 ? '🥇 #1' : user.rank === 2 ? '🥈 #2' : user.rank === 3 ? '🥉 #3' : `#${user.rank}`}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2">
                      <Trophy className={`w-4 h-4 ${user.rank === 1 ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span>{user.name}</span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400">{user.email}</td>
                    <td className="py-3.5 px-3 font-bold text-amber-300 flex items-center gap-1">
                      <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                      <span>{user.streak_count} Days</span>
                    </td>
                    <td className="py-3.5 px-3 font-extrabold text-cyan-300">{user.points} PTS</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30">
                        {user.badge}
                      </span>
                    </td>
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
