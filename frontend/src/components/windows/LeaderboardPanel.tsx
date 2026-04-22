'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/utils';
import { Trophy, Medal } from 'lucide-react';

export default function LeaderboardPanel() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/leaderboard');
      setLeaderboard(data.leaderboard || []);
    } catch {
      setLeaderboard([]);
    }
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy size={14} className="text-yellow-500" />;
    if (rank === 2) return <Medal size={14} className="text-gray-400" />;
    if (rank === 3) return <Medal size={14} className="text-amber-600" />;
    return <span className="text-[10px] text-gray-500 w-[14px] text-center">{rank}</span>;
  };

  return (
    <div className="p-3 bg-retro-window h-full flex flex-col">
      <div className="retro-panel-inset p-2 mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-pixel text-[10px] text-retro-title">Leaderboard</h2>
          <p className="text-[10px] text-gray-500">Top chess players</p>
        </div>
        <button className="retro-button text-[10px] !min-w-0 !px-2" onClick={loadLeaderboard}>
          Refresh
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-bold text-gray-500 border-b border-gray-400">
        <span className="w-6">#</span>
        <span className="flex-1">Player</span>
        <span className="w-12 text-right">ELO</span>
        <span className="w-8 text-right">W</span>
        <span className="w-8 text-right">L</span>
      </div>

      {/* List */}
      <div className="flex-1 retro-panel-inset overflow-y-auto">
        {loading ? (
          <p className="text-center text-[10px] text-gray-400 py-4">Loading...</p>
        ) : leaderboard.length === 0 ? (
          <p className="text-center text-[10px] text-gray-400 py-4">No players yet</p>
        ) : (
          leaderboard.map((entry: any) => (
            <div
              key={entry.userId}
              className="flex items-center gap-2 px-2 py-1.5 text-[11px] border-b border-gray-200 hover:bg-blue-50"
            >
              <span className="w-6 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </span>
              <span className="flex-1 font-bold truncate">{entry.username}</span>
              <span className="w-12 text-right font-mono font-bold text-retro-title">{entry.elo}</span>
              <span className="w-8 text-right text-green-700">{entry.gamesWon}</span>
              <span className="w-8 text-right text-red-700">{entry.gamesLost}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
