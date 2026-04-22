'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/stores/game.store';
import { useWindowStore } from '@/stores/window.store';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { Check, X, Crown } from 'lucide-react';

export default function LobbyPanel({ roomId }: { roomId: string }) {
  const { players, status, setReady, startGame, leaveRoom, setupListeners, cleanup } = useGameStore();
  const { openWindow } = useWindowStore();
  const { user } = useAuthStore();

  useEffect(() => {
    setupListeners();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (status === 'playing') {
      openWindow('chess', 'Chess Game');
    }
  }, [status]);

  const currentPlayer = players.find((p: any) => p.userId === user?.id || p.user?.id === user?.id);
  const isHost = currentPlayer?.isHost;
  const allReady = players.length >= 2 && players.every((p: any) => p.isReady);

  return (
    <div className="p-3 bg-retro-window h-full flex flex-col">
      <div className="retro-panel-inset p-2 mb-3">
        <h2 className="font-bold text-[12px]">Game Lobby</h2>
        <p className="text-[10px] text-gray-500">Room: {roomId?.slice(0, 8).toUpperCase()}</p>
      </div>

      {/* Players */}
      <div className="retro-panel-inset p-2 flex-1 mb-3">
        <h3 className="font-bold text-[11px] mb-2">Players ({players.length}/2)</h3>
        <div className="space-y-2">
          {players.map((player: any) => (
            <div key={player.userId || player.user?.id} className="retro-panel p-2 flex items-center gap-2">
              {player.isHost && <Crown size={12} className="text-yellow-600" />}
              <span className="flex-1 text-[11px] font-bold">
                {player.user?.username || player.username || 'Player'}
              </span>
              <span className={cn(
                'text-[10px] px-2 py-0.5',
                player.isReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              )}>
                {player.isReady ? 'Ready' : 'Not Ready'}
              </span>
            </div>
          ))}
          {players.length < 2 && (
            <div className="retro-panel p-2 text-center text-[10px] text-gray-400 border-dashed border">
              Waiting for opponent...
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          className="retro-button flex-1 flex items-center justify-center gap-1"
          onClick={() => setReady(!currentPlayer?.isReady)}
        >
          {currentPlayer?.isReady ? <X size={12} /> : <Check size={12} />}
          {currentPlayer?.isReady ? 'Unready' : 'Ready'}
        </button>

        {isHost && (
          <button
            className="retro-button flex-1 font-bold"
            disabled={!allReady}
            onClick={startGame}
          >
            Start Game
          </button>
        )}

        <button className="retro-button" onClick={leaveRoom}>
          Leave
        </button>
      </div>
    </div>
  );
}
