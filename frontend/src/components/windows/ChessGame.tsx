'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/stores/game.store';
import ChessBoard from '@/components/ChessBoard';
import { cn } from '@/lib/utils';
import { Flag, RotateCcw } from 'lucide-react';

export default function ChessGame() {
  const {
    status, currentTurn, playerColor, isCheck, isCheckmate, isStalemate,
    isDraw, winner, moveHistory, resign, error, setupListeners, cleanup, messages, sendMessage
  } = useGameStore();

  useEffect(() => {
    setupListeners();
    return () => cleanup();
  }, []);

  const statusText = () => {
    if (status === 'finished') {
      if (isCheckmate) return `Checkmate! ${winner === playerColor ? 'You win!' : 'You lose!'}`;
      if (isStalemate) return 'Stalemate - Draw!';
      if (isDraw) return 'Game ended in a draw!';
      return `Game over - ${winner} wins!`;
    }
    if (isCheck) return `${currentTurn === playerColor ? 'You are' : 'Opponent is'} in check!`;
    if (currentTurn === playerColor) return 'Your turn';
    return "Opponent's turn";
  };

  return (
    <div className="flex h-full bg-retro-window">
      {/* Board area */}
      <div className="flex-1 flex flex-col p-2">
        {/* Status bar */}
        <div className={cn(
          'retro-panel-inset px-2 py-1 mb-2 text-[11px] font-bold text-center',
          status === 'finished' && winner === playerColor && 'bg-green-100 text-green-800',
          status === 'finished' && winner && winner !== playerColor && 'bg-red-100 text-red-800',
          isCheck && status === 'playing' && 'bg-yellow-100 text-yellow-800',
        )}>
          {statusText()}
        </div>

        {/* Player info - opponent */}
        <div className="retro-panel px-2 py-1 mb-1 text-[10px] flex justify-between">
          <span className="font-bold">{playerColor === 'white' ? 'Black' : 'White'} (Opponent)</span>
          <span className={cn(
            'px-1',
            currentTurn !== playerColor && status === 'playing' && 'bg-retro-title text-white'
          )}>
            {currentTurn !== playerColor && status === 'playing' ? 'Thinking...' : ''}
          </span>
        </div>

        {/* Chess board */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[480px]">
            <ChessBoard />
          </div>
        </div>

        {/* Player info - you */}
        <div className="retro-panel px-2 py-1 mt-1 text-[10px] flex justify-between">
          <span className="font-bold">{playerColor === 'white' ? 'White' : 'Black'} (You)</span>
          <span className={cn(
            'px-1',
            currentTurn === playerColor && status === 'playing' && 'bg-retro-title text-white'
          )}>
            {currentTurn === playerColor && status === 'playing' ? 'Your turn' : ''}
          </span>
        </div>

        {/* Controls */}
        {status === 'playing' && (
          <div className="flex gap-2 mt-2">
            <button className="retro-button flex items-center gap-1 text-[10px]" onClick={resign}>
              <Flag size={10} /> Resign
            </button>
          </div>
        )}
      </div>

      {/* Side panel - Move history + Chat */}
      <div className="w-[180px] flex flex-col border-l border-gray-400 bg-retro-window">
        {/* Move history */}
        <div className="flex-1 flex flex-col">
          <div className="retro-title-bar text-[10px] py-0.5 px-2">Moves</div>
          <div className="flex-1 retro-panel-inset m-1 p-1 overflow-y-auto text-[10px]">
            {moveHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-2">No moves yet</p>
            ) : (
              <div className="space-y-0.5">
                {moveHistory.map((move: any, i: number) => (
                  <div key={i} className={cn('px-1', i % 2 === 0 ? 'bg-gray-50' : '')}>
                    {i % 2 === 0 && <span className="text-gray-400 mr-1">{Math.floor(i / 2) + 1}.</span>}
                    <span className="font-mono">{move.notation || `${move.from}-${move.to}`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mini chat */}
        <div className="h-[120px] flex flex-col border-t border-gray-400">
          <div className="retro-title-bar text-[10px] py-0.5 px-2">Chat</div>
          <div className="flex-1 retro-panel-inset m-1 p-1 overflow-y-auto text-[9px]">
            {messages.map((msg: any, i: number) => (
              <div key={msg.id || i} className={cn(msg.system && 'text-gray-400 italic')}>
                {!msg.system && <span className="font-bold">{msg.username}: </span>}
                {msg.content}
              </div>
            ))}
          </div>
          <div className="p-1">
            <input
              className="retro-input w-full text-[9px]"
              placeholder="Type..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                  sendMessage((e.target as HTMLInputElement).value.trim());
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="absolute bottom-2 left-2 right-2 bg-red-100 border border-red-500 p-2 text-[10px] text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}
