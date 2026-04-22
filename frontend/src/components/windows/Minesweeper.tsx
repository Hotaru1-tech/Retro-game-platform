'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { RotateCcw, Flag, Bomb } from 'lucide-react';

type CellState = {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
};

type Difficulty = 'easy' | 'medium' | 'hard';

const CONFIGS: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
};

function createBoard(rows: number, cols: number, mines: number, safeR?: number, safeC?: number): CellState[][] {
  const board: CellState[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }))
  );

  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (board[r][c].mine) continue;
    if (safeR !== undefined && safeC !== undefined && Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
    board[r][c].mine = true;
    placed++;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++;
        }
      board[r][c].adjacent = count;
    }
  }

  return board;
}

function cloneBoard(b: CellState[][]): CellState[][] {
  return b.map(row => row.map(cell => ({ ...cell })));
}

function reveal(board: CellState[][], r: number, c: number) {
  const rows = board.length, cols = board[0].length;
  if (r < 0 || r >= rows || c < 0 || c >= cols) return;
  if (board[r][c].revealed || board[r][c].flagged) return;
  board[r][c].revealed = true;
  if (board[r][c].adjacent === 0 && !board[r][c].mine) {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++)
        if (dr !== 0 || dc !== 0) reveal(board, r + dr, c + dc);
  }
}

const NUM_COLORS: Record<number, string> = {
  1: 'text-blue-700', 2: 'text-green-700', 3: 'text-red-700', 4: 'text-purple-800',
  5: 'text-red-900', 6: 'text-teal-600', 7: 'text-black', 8: 'text-gray-600',
};

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const config = CONFIGS[difficulty];
  const [board, setBoard] = useState<CellState[][]>(() => createBoard(config.rows, config.cols, config.mines));
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [timerRef, setTimerRef] = useState<NodeJS.Timeout | null>(null);

  const flagCount = board.flat().filter(c => c.flagged).length;

  const startTimer = useCallback(() => {
    const id = setInterval(() => setTime(t => t + 1), 1000);
    setTimerRef(id);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef) clearInterval(timerRef);
  }, [timerRef]);

  const reset = useCallback((diff?: Difficulty) => {
    const d = diff || difficulty;
    const cfg = CONFIGS[d];
    stopTimer();
    setBoard(createBoard(cfg.rows, cfg.cols, cfg.mines));
    setGameOver(false);
    setWon(false);
    setStarted(false);
    setTime(0);
    if (diff) setDifficulty(diff);
  }, [difficulty, stopTimer]);

  const checkWin = useCallback((b: CellState[][]) => {
    const allNonMinesRevealed = b.flat().every(c => c.mine || c.revealed);
    if (allNonMinesRevealed) {
      setWon(true);
      setGameOver(true);
      stopTimer();
      // Auto-flag all mines
      b.forEach(row => row.forEach(c => { if (c.mine) c.flagged = true; }));
    }
  }, [stopTimer]);

  const handleClick = useCallback((r: number, c: number) => {
    if (gameOver || board[r][c].flagged || board[r][c].revealed) return;

    let b = cloneBoard(board);

    if (!started) {
      b = createBoard(config.rows, config.cols, config.mines, r, c);
      setStarted(true);
      startTimer();
    }

    if (b[r][c].mine) {
      b[r][c].revealed = true;
      b.forEach(row => row.forEach(cell => { if (cell.mine) cell.revealed = true; }));
      setBoard(b);
      setGameOver(true);
      stopTimer();
      return;
    }

    reveal(b, r, c);
    setBoard(b);
    checkWin(b);
  }, [board, gameOver, started, config, startTimer, stopTimer, checkWin]);

  const handleRightClick = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameOver || board[r][c].revealed) return;
    const b = cloneBoard(board);
    b[r][c].flagged = !b[r][c].flagged;
    setBoard(b);
  }, [board, gameOver]);

  const cellSize = difficulty === 'hard' ? 20 : difficulty === 'medium' ? 22 : 26;

  return (
    <div className="flex flex-col items-center h-full bg-retro-window p-2 overflow-auto">
      {/* Header */}
      <div className="retro-panel p-2 mb-2 flex items-center justify-between w-full gap-2">
        <div className="retro-panel-inset px-2 py-0.5 text-[14px] font-mono font-bold text-red-700 min-w-[50px] text-center">
          {String(config.mines - flagCount).padStart(3, '0')}
        </div>

        <button
          className="retro-button !min-w-0 !px-2 text-[16px]"
          onClick={() => reset()}
        >
          {gameOver ? (won ? '😎' : '😵') : '🙂'}
        </button>

        <div className="retro-panel-inset px-2 py-0.5 text-[14px] font-mono font-bold text-red-700 min-w-[50px] text-center">
          {String(Math.min(time, 999)).padStart(3, '0')}
        </div>
      </div>

      {/* Difficulty tabs */}
      <div className="flex gap-0 mb-2">
        {(['easy', 'medium', 'hard'] as const).map(d => (
          <button
            key={d}
            className={cn(
              'px-3 py-0.5 text-[10px] border border-gray-400',
              difficulty === d ? 'bg-white font-bold' : 'bg-retro-button'
            )}
            onClick={() => reset(d)}
          >
            {d === 'easy' ? 'Beginner' : d === 'medium' ? 'Intermediate' : 'Expert'}
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="retro-panel-inset p-[2px]">
        <div className="flex flex-col" style={{ gap: 0 }}>
          {board.map((row, r) => (
            <div key={r} className="flex" style={{ gap: 0 }}>
              {row.map((cell, c) => (
                <button
                  key={c}
                  className={cn(
                    'flex items-center justify-center font-bold border-0',
                    cell.revealed
                      ? cell.mine
                        ? 'bg-red-300'
                        : 'bg-[#c0c0c0] border-t border-l border-[#808080]'
                      : 'bg-[#c0c0c0] shadow-retro-button active:shadow-retro-button-pressed',
                  )}
                  style={{ width: cellSize, height: cellSize, fontSize: cellSize * 0.55 }}
                  onClick={() => handleClick(r, c)}
                  onContextMenu={(e) => handleRightClick(e, r, c)}
                >
                  {cell.revealed && cell.mine && '💣'}
                  {cell.revealed && !cell.mine && cell.adjacent > 0 && (
                    <span className={NUM_COLORS[cell.adjacent]}>{cell.adjacent}</span>
                  )}
                  {!cell.revealed && cell.flagged && '🚩'}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      {gameOver && (
        <div className={cn(
          'mt-2 retro-panel-inset px-3 py-1 text-[11px] font-bold text-center',
          won ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        )}>
          {won ? `You won! Time: ${time}s` : 'Game Over! Click the face to restart.'}
        </div>
      )}
    </div>
  );
}
