'use client';

import { useState, useEffect } from 'react';
import { cn, apiFetch } from '@/lib/utils';
import { Monitor, Hash, Bug, Bomb, Grid3X3, ArrowLeft, Gamepad2, Globe, User } from 'lucide-react';
import LocalChessGame from './LocalChessGame';
import TicTacToe from './TicTacToe';
import SnakeGame from './SnakeGame';
import Minesweeper from './Minesweeper';
import MemoryGame from './MemoryGame';

interface GameDef {
  id: string;
  name: string;
  icon: any;
  description: string;
  players: string;
  component?: React.ComponentType;
  // Community game fields
  isCommunity?: boolean;
  gameUrl?: string;
  gameType?: string;
  ownerName?: string;
  plays?: number;
}

const BUILTIN_GAMES: GameDef[] = [
  { id: 'chess', name: 'Chess', icon: Monitor, description: 'Classic chess — full rules, castling, en passant', players: '2 Players Local', component: LocalChessGame },
  { id: 'tictactoe', name: 'Tic-Tac-Toe', icon: Hash, description: 'Classic X vs O on a 3x3 grid', players: '2 Players Local', component: TicTacToe },
  { id: 'snake', name: 'Snake', icon: Bug, description: 'Eat, grow, survive — classic arcade snake', players: '1 Player', component: SnakeGame },
  { id: 'minesweeper', name: 'Minesweeper', icon: Bomb, description: 'Find all mines — 3 difficulty levels', players: '1 Player', component: Minesweeper },
  { id: 'memory', name: 'Memory Match', icon: Grid3X3, description: 'Flip cards to find matching pairs', players: '1 Player', component: MemoryGame },
];

function CommunityGameEmbed({ url, onBack }: { url: string; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 bg-retro-window px-2 py-1 border-b border-gray-400 flex-shrink-0">
        <button className="retro-button !min-w-0 !px-2 !py-0.5 flex items-center gap-1 text-[10px]" onClick={onBack}>
          <ArrowLeft size={10} /> Back
        </button>
        <div className="flex items-center gap-1.5 text-[11px]">
          <Globe size={14} className="text-retro-title" />
          <span className="font-bold">Community Game</span>
        </div>
      </div>
      <div className="flex-1">
        <iframe src={url} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin" title="Community Game" />
      </div>
    </div>
  );
}

export default function GamesApp() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [communityGames, setCommunityGames] = useState<GameDef[]>([]);
  const [tab, setTab] = useState<'builtin' | 'community'>('builtin');
  const [communityUrl, setCommunityUrl] = useState<string | null>(null);

  useEffect(() => {
    loadCommunityGames();
  }, []);

  const loadCommunityGames = async () => {
    const all: GameDef[] = [];
    // Load from old custom games API
    try {
      const data = await apiFetch('/api/developer/games/community');
      all.push(...data.map((g: any) => ({
        id: g.id, name: g.title, icon: Globe, description: g.description,
        players: 'Community', isCommunity: true, gameUrl: g.gameUrl,
        gameType: g.gameType, ownerName: g.owner?.username, plays: g.plays,
      })));
    } catch { /* ignore */ }
    // Load from new approved submissions API
    try {
      const data = await apiFetch('/api/submissions/approved');
      all.push(...data.map((g: any) => ({
        id: g.id, name: g.name, icon: Globe, description: g.description,
        players: g.mode === 'multiplayer' ? `${g.minPlayers}-${g.maxPlayers} Players` : g.mode === 'both' ? 'Solo/Multi' : '1 Player',
        isCommunity: true, gameUrl: g.gameUrl, gameType: 'iframe',
        ownerName: g.developer?.username, plays: g.plays,
      })));
    } catch { /* ignore */ }
    setCommunityGames(all);
  };

  // Playing a community game (iframe)
  if (communityUrl) {
    return <CommunityGameEmbed url={communityUrl} onBack={() => setCommunityUrl(null)} />;
  }

  // Playing a built-in game
  const game = BUILTIN_GAMES.find(g => g.id === activeGame);
  if (game && game.component) {
    const GameComponent = game.component;
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 bg-retro-window px-2 py-1 border-b border-gray-400 flex-shrink-0">
          <button className="retro-button !min-w-0 !px-2 !py-0.5 flex items-center gap-1 text-[10px]" onClick={() => setActiveGame(null)}>
            <ArrowLeft size={10} /> Back
          </button>
          <div className="flex items-center gap-1.5 text-[11px]">
            <game.icon size={14} className="text-retro-title" />
            <span className="font-bold">{game.name}</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <GameComponent />
        </div>
      </div>
    );
  }

  const allGames = tab === 'builtin' ? BUILTIN_GAMES : communityGames;
  const totalCount = BUILTIN_GAMES.length + communityGames.length;

  return (
    <div className="flex flex-col h-full bg-retro-window">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="retro-panel-inset p-3 flex items-center gap-3">
          <div className="w-12 h-12 bg-retro-title flex items-center justify-center rounded-sm flex-shrink-0">
            <Gamepad2 size={28} className="text-white" />
          </div>
          <div>
            <h2 className="font-pixel text-[11px] text-retro-title">Games</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">{totalCount} games available</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-3 mb-1">
        <button
          className={cn('px-3 py-1 text-[11px] border border-gray-400', tab === 'builtin' ? 'bg-white font-bold border-b-white -mb-[1px] relative z-10' : 'bg-retro-button')}
          onClick={() => setTab('builtin')}
        >
          Built-in ({BUILTIN_GAMES.length})
        </button>
        <button
          className={cn('px-3 py-1 text-[11px] border border-gray-400', tab === 'community' ? 'bg-white font-bold border-b-white -mb-[1px] relative z-10' : 'bg-retro-button')}
          onClick={() => { setTab('community'); loadCommunityGames(); }}
        >
          Community ({communityGames.length})
        </button>
      </div>

      {/* Game list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {allGames.length === 0 ? (
          <div className="retro-panel-inset p-6 text-center">
            <Globe size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-[11px] text-gray-500">No community games yet</p>
            <p className="text-[9px] text-gray-400">Developers can publish games from the Developer Panel</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {allGames.map(g => (
              <button
                key={g.id}
                className="retro-panel p-3 flex items-center gap-3 text-left hover:bg-blue-50 cursor-pointer w-full transition-colors"
                onClick={() => {
                  if (g.isCommunity && g.gameUrl) {
                    if (g.gameType === 'link') {
                      window.open(g.gameUrl, '_blank');
                    } else {
                      setCommunityUrl(g.gameUrl);
                    }
                    apiFetch(`/api/developer/games/${g.id}/play`, { method: 'POST' }).catch(() => {});
                  } else {
                    setActiveGame(g.id);
                  }
                }}
              >
                <div className={cn(
                  'w-11 h-11 flex items-center justify-center flex-shrink-0 rounded-sm',
                  g.isCommunity ? 'bg-purple-700' : 'bg-retro-title'
                )}>
                  <g.icon size={22} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[12px] leading-tight">{g.name}</h3>
                  <p className="text-[10px] text-gray-600 truncate">{g.description}</p>
                  {g.isCommunity && g.ownerName && (
                    <div className="flex items-center gap-1 text-[9px] text-purple-600 mt-0.5">
                      <User size={8} /> by {g.ownerName} · {g.plays || 0} plays
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end flex-shrink-0 gap-1">
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-sm text-white',
                    g.isCommunity ? 'bg-purple-700' : 'bg-retro-title'
                  )}>
                    {g.players}
                  </span>
                  <span className="text-[10px] text-retro-title font-bold">Play &rarr;</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
