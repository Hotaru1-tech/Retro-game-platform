'use client';

import { useGameStore } from '@/stores/game.store';
import { cn, CHESS_PIECES } from '@/lib/utils';

export default function ChessBoard() {
  const {
    board, selectedSquare, validMoves, lastMove, playerColor,
    currentTurn, isCheck, selectSquare, status
  } = useGameStore();

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[11px] text-gray-500">Waiting for game to start...</p>
      </div>
    );
  }

  const isFlipped = playerColor === 'black';

  const renderSquare = (row: number, col: number) => {
    const actualRow = isFlipped ? 7 - row : row;
    const actualCol = isFlipped ? 7 - col : col;
    const piece = board[actualRow]?.[actualCol];
    const isLight = (actualRow + actualCol) % 2 === 0;
    const isSelected = selectedSquare?.row === actualRow && selectedSquare?.col === actualCol;
    const isValidMove = validMoves.some(m => m.row === actualRow && m.col === actualCol);
    const isLastMoveFrom = lastMove?.from.row === actualRow && lastMove?.from.col === actualCol;
    const isLastMoveTo = lastMove?.to.row === actualRow && lastMove?.to.col === actualCol;
    const isKingInCheck = isCheck && piece?.type === 'king' && piece?.color === currentTurn;
    const canInteract = status === 'playing' && currentTurn === playerColor;

    return (
      <div
        key={`${actualRow}-${actualCol}`}
        className={cn(
          'relative flex items-center justify-center cursor-pointer transition-colors',
          isLight ? 'chess-square-light' : 'chess-square-dark',
          isSelected && 'chess-square-selected',
          isValidMove && 'chess-square-valid',
          (isLastMoveFrom || isLastMoveTo) && !isSelected && 'chess-square-last-move',
          isKingInCheck && 'chess-square-check',
          !canInteract && 'cursor-default'
        )}
        style={{ width: '100%', aspectRatio: '1' }}
        onClick={() => canInteract && selectSquare(actualRow, actualCol)}
      >
        {piece && (
          <span className={cn(
            'text-[2.5rem] leading-none select-none drop-shadow-sm',
            piece.color === 'white' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-gray-900'
          )}>
            {CHESS_PIECES[piece.color]?.[piece.type] || '?'}
          </span>
        )}

        {isValidMove && !piece && (
          <div className="absolute w-[30%] h-[30%] bg-black/25 rounded-full" />
        )}

        {isValidMove && piece && (
          <div className="absolute inset-0 border-[3px] border-black/25 rounded-sm" />
        )}

        {/* Rank/File labels */}
        {col === 0 && (
          <span className={cn(
            'absolute top-0.5 left-0.5 text-[9px] font-bold',
            isLight ? 'text-amber-800' : 'text-amber-100'
          )}>
            {8 - actualRow}
          </span>
        )}
        {row === 7 && (
          <span className={cn(
            'absolute bottom-0 right-0.5 text-[9px] font-bold',
            isLight ? 'text-amber-800' : 'text-amber-100'
          )}>
            {String.fromCharCode(97 + actualCol)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="retro-panel-inset p-1">
      <div className="grid grid-cols-8 gap-0 border border-black">
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 8 }, (_, col) => renderSquare(row, col))
        )}
      </div>
    </div>
  );
}
