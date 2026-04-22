'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

type Cell = 'X' | 'O' | null;
type Board = Cell[];

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function checkWinner(board: Board): { winner: Cell; line: number[] | null } {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });

  const { winner, line: winLine } = checkWinner(board);
  const isDraw = !winner && board.every(c => c !== null);
  const gameOver = !!winner || isDraw;

  const handleClick = useCallback((index: number) => {
    if (board[index] || gameOver) return;
    const newBoard = [...board];
    newBoard[index] = turn;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result.winner) {
      setScores(s => ({ ...s, [result.winner!]: s[result.winner!] + 1 }));
    } else if (newBoard.every(c => c !== null)) {
      setScores(s => ({ ...s, draws: s.draws + 1 }));
    }

    setTurn(turn === 'X' ? 'O' : 'X');
  }, [board, turn, gameOver]);

  const reset = useCallback(() => {
    setBoard(Array(9).fill(null));
    setTurn('X');
  }, []);

  const resetAll = useCallback(() => {
    reset();
    setScores({ X: 0, O: 0, draws: 0 });
  }, [reset]);

  return (
    <div className="flex flex-col items-center h-full bg-retro-window p-3">
      {/* Status */}
      <div className={cn(
        'retro-panel-inset px-4 py-1.5 mb-3 text-[12px] font-bold text-center w-full',
        winner && 'bg-green-100 text-green-800',
        isDraw && 'bg-yellow-100 text-yellow-800',
      )}>
        {winner ? `${winner} wins!` : isDraw ? "It's a draw!" : `${turn}'s turn`}
      </div>

      {/* Scoreboard */}
      <div className="flex gap-4 mb-3 text-[11px]">
        <div className="retro-panel px-3 py-1 text-center">
          <div className="font-bold text-blue-700 text-[14px]">X</div>
          <div>{scores.X} wins</div>
        </div>
        <div className="retro-panel px-3 py-1 text-center">
          <div className="font-bold text-[14px]">Draws</div>
          <div>{scores.draws}</div>
        </div>
        <div className="retro-panel px-3 py-1 text-center">
          <div className="font-bold text-red-700 text-[14px]">O</div>
          <div>{scores.O} wins</div>
        </div>
      </div>

      {/* Board */}
      <div className="retro-panel-inset p-2">
        <div className="grid grid-cols-3 gap-[3px] bg-black p-[3px]">
          {board.map((cell, i) => {
            const isWinCell = winLine?.includes(i);
            return (
              <button
                key={i}
                className={cn(
                  'w-[72px] h-[72px] flex items-center justify-center text-[36px] font-bold cursor-pointer transition-colors',
                  'bg-white hover:bg-gray-100',
                  cell === 'X' && 'text-blue-700',
                  cell === 'O' && 'text-red-700',
                  isWinCell && 'bg-green-100',
                  !cell && !gameOver && 'hover:bg-blue-50',
                )}
                onClick={() => handleClick(i)}
                disabled={!!cell || gameOver}
              >
                {cell}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-3">
        <button className="retro-button flex items-center gap-1 text-[10px]" onClick={reset}>
          <RotateCcw size={10} /> New Round
        </button>
        <button className="retro-button text-[10px]" onClick={resetAll}>
          Reset Scores
        </button>
      </div>

      <div className="mt-2 text-[9px] text-gray-500 text-center">
        2 Players · Take turns on the same screen
      </div>
    </div>
  );
}
