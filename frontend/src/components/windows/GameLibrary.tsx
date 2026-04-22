'use client';

import { useWindowStore } from '@/stores/window.store';
import { useAuthStore } from '@/stores/auth.store';
import { Swords, Monitor, Hash, Bug, Grid3X3, Bomb } from 'lucide-react';

const games = [
  {
    id: 'chess-local',
    name: 'Chess — Local Play',
    icon: Monitor,
    description: '2 players on 1 computer, take turns',
    status: 'available' as const,
  },
  {
    id: 'chess-online',
    name: 'Chess — Online',
    icon: Swords,
    description: 'Play against others online with matchmaking',
    status: 'available' as const,
  },
  {
    id: 'tictactoe',
    name: 'Tic-Tac-Toe',
    icon: Hash,
    description: 'Classic X and O — 2 players, local',
    status: 'available' as const,
  },
  {
    id: 'snake',
    name: 'Snake',
    icon: Bug,
    description: 'Classic snake game — eat, grow, survive!',
    status: 'available' as const,
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    icon: Bomb,
    description: 'Classic Windows Minesweeper — 3 difficulties',
    status: 'available' as const,
  },
  {
    id: 'memory',
    name: 'Memory Match',
    icon: Grid3X3,
    description: 'Flip cards and find matching pairs',
    status: 'available' as const,
  },
];

export default function GameLibrary() {
  const { openWindow } = useWindowStore();
  const { isAuthenticated } = useAuthStore();

  const handlePlay = (gameId: string) => {
    if (gameId === 'chess-local') {
      openWindow('local-chess', 'Chess — Local Play');
    } else if (gameId === 'chess-online') {
      if (!isAuthenticated) {
        openWindow('settings', 'Login Required');
        return;
      }
      openWindow('matchmaking', 'Quick Match - Chess');
    } else if (gameId === 'tictactoe') {
      openWindow('tictactoe', 'Tic-Tac-Toe');
    } else if (gameId === 'snake') {
      openWindow('snake', 'Snake');
    } else if (gameId === 'minesweeper') {
      openWindow('minesweeper', 'Minesweeper');
    } else if (gameId === 'memory') {
      openWindow('memory', 'Memory Match');
    }
  };

  return (
    <div className="p-3 bg-retro-window h-full">
      <div className="retro-panel-inset p-2 mb-3">
        <h2 className="font-pixel text-[10px] text-retro-title">Game Library</h2>
        <p className="text-[10px] text-gray-600 mt-1">Select a game to play</p>
      </div>

      <div className="space-y-2">
        {games.map(game => (
          <div key={game.id} className="retro-panel p-3 flex items-center gap-3">
            <div className="w-12 h-12 bg-retro-title flex items-center justify-center flex-shrink-0">
              <game.icon size={24} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-[12px]">{game.name}</h3>
              <p className="text-[10px] text-gray-600 truncate">{game.description}</p>
            </div>
            <button
              className="retro-button text-[11px]"
              onClick={() => handlePlay(game.id)}
            >
              Play
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
