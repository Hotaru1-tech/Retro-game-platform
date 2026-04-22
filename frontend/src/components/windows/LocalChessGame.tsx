'use client';

import { useState, useCallback } from 'react';
import { cn, CHESS_PIECES } from '@/lib/utils';
import { Flag, RotateCcw } from 'lucide-react';

// --- Types ---
type PieceColor = 'white' | 'black';
type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
interface Piece { type: PieceType; color: PieceColor; hasMoved?: boolean; }
type Square = Piece | null;
type Board = Square[][];
interface Pos { row: number; col: number; }

// --- Board setup ---
function createBoard(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  const rank: PieceType[] = ['rook','knight','bishop','queen','king','bishop','knight','rook'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: rank[c], color: 'black' };
    b[1][c] = { type: 'pawn', color: 'black' };
    b[6][c] = { type: 'pawn', color: 'white' };
    b[7][c] = { type: rank[c], color: 'white' };
  }
  return b;
}

function cloneBoard(b: Board): Board {
  return b.map(r => r.map(s => s ? { ...s } : null));
}

function inBounds(r: number, c: number) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function findKing(b: Board, color: PieceColor): Pos | null {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (b[r][c]?.type === 'king' && b[r][c]?.color === color) return { row: r, col: c };
  return null;
}

function isAttacked(b: Board, pos: Pos, by: PieceColor): boolean {
  const dir = by === 'white' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const r = pos.row + dir, c = pos.col + dc;
    if (inBounds(r, c) && b[r][c]?.color === by && b[r][c]?.type === 'pawn') return true;
  }
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const r = pos.row + dr, c = pos.col + dc;
    if (inBounds(r, c) && b[r][c]?.color === by && b[r][c]?.type === 'knight') return true;
  }
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const r = pos.row + dr, c = pos.col + dc;
      if (inBounds(r, c) && b[r][c]?.color === by && b[r][c]?.type === 'king') return true;
    }
  for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    for (let i = 1; i < 8; i++) {
      const r = pos.row + dr * i, c = pos.col + dc * i;
      if (!inBounds(r, c)) break;
      if (b[r][c]) { if (b[r][c]!.color === by && (b[r][c]!.type === 'rook' || b[r][c]!.type === 'queen')) return true; break; }
    }
  }
  for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    for (let i = 1; i < 8; i++) {
      const r = pos.row + dr * i, c = pos.col + dc * i;
      if (!inBounds(r, c)) break;
      if (b[r][c]) { if (b[r][c]!.color === by && (b[r][c]!.type === 'bishop' || b[r][c]!.type === 'queen')) return true; break; }
    }
  }
  return false;
}

function inCheck(b: Board, color: PieceColor): boolean {
  const k = findKing(b, color);
  return k ? isAttacked(b, k, color === 'white' ? 'black' : 'white') : false;
}

function getRawMoves(b: Board, from: Pos, ep: Pos | null): Pos[] {
  const p = b[from.row][from.col];
  if (!p) return [];
  const moves: Pos[] = [];
  const { type, color } = p;

  if (type === 'pawn') {
    const dir = color === 'white' ? -1 : 1;
    const start = color === 'white' ? 6 : 1;
    const fwd = from.row + dir;
    if (inBounds(fwd, from.col) && !b[fwd][from.col]) {
      moves.push({ row: fwd, col: from.col });
      const dbl = from.row + dir * 2;
      if (from.row === start && !b[dbl][from.col]) moves.push({ row: dbl, col: from.col });
    }
    for (const dc of [-1, 1]) {
      const nr = from.row + dir, nc = from.col + dc;
      if (inBounds(nr, nc)) {
        if (b[nr][nc] && b[nr][nc]!.color !== color) moves.push({ row: nr, col: nc });
        if (ep && ep.row === nr && ep.col === nc) moves.push({ row: nr, col: nc });
      }
    }
  } else if (type === 'knight') {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const r = from.row + dr, c = from.col + dc;
      if (inBounds(r, c) && (!b[r][c] || b[r][c]!.color !== color)) moves.push({ row: r, col: c });
    }
  } else if (type === 'king') {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const r = from.row + dr, c = from.col + dc;
        if (inBounds(r, c) && (!b[r][c] || b[r][c]!.color !== color)) moves.push({ row: r, col: c });
      }
    if (!p.hasMoved) {
      const row = from.row;
      const opp = color === 'white' ? 'black' : 'white';
      const kr = b[row][7];
      if (kr?.type === 'rook' && kr.color === color && !kr.hasMoved && !b[row][5] && !b[row][6] &&
          !isAttacked(b, {row, col:4}, opp) && !isAttacked(b, {row, col:5}, opp) && !isAttacked(b, {row, col:6}, opp))
        moves.push({ row, col: 6 });
      const qr = b[row][0];
      if (qr?.type === 'rook' && qr.color === color && !qr.hasMoved && !b[row][1] && !b[row][2] && !b[row][3] &&
          !isAttacked(b, {row, col:4}, opp) && !isAttacked(b, {row, col:3}, opp) && !isAttacked(b, {row, col:2}, opp))
        moves.push({ row, col: 2 });
    }
  } else {
    const dirs = type === 'rook' ? [[0,1],[0,-1],[1,0],[-1,0]] :
                 type === 'bishop' ? [[1,1],[1,-1],[-1,1],[-1,-1]] :
                 [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [dr, dc] of dirs) {
      for (let i = 1; i < 8; i++) {
        const r = from.row + dr * i, c = from.col + dc * i;
        if (!inBounds(r, c)) break;
        if (!b[r][c]) moves.push({ row: r, col: c });
        else { if (b[r][c]!.color !== color) moves.push({ row: r, col: c }); break; }
      }
    }
  }
  return moves;
}

function applyMove(b: Board, from: Pos, to: Pos, ep: Pos | null) {
  const p = b[from.row][from.col]!;
  if (p.type === 'pawn' && ep && to.row === ep.row && to.col === ep.col) {
    b[p.color === 'white' ? to.row + 1 : to.row - 1][to.col] = null;
  }
  if (p.type === 'king' && Math.abs(to.col - from.col) === 2) {
    if (to.col === 6) { b[from.row][5] = b[from.row][7]; b[from.row][7] = null; if (b[from.row][5]) b[from.row][5]!.hasMoved = true; }
    else { b[from.row][3] = b[from.row][0]; b[from.row][0] = null; if (b[from.row][3]) b[from.row][3]!.hasMoved = true; }
  }
  b[to.row][to.col] = { ...p, hasMoved: true };
  b[from.row][from.col] = null;
}

function getLegalMoves(b: Board, from: Pos, ep: Pos | null): Pos[] {
  const p = b[from.row][from.col];
  if (!p) return [];
  return getRawMoves(b, from, ep).filter(to => {
    const t = cloneBoard(b);
    applyMove(t, from, to, ep);
    return !inCheck(t, p.color);
  });
}

function hasAnyMoves(b: Board, color: PieceColor, ep: Pos | null): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (b[r][c]?.color === color && getLegalMoves(b, { row: r, col: c }, ep).length > 0) return true;
  return false;
}

const PIECE_SYM: Record<PieceType, string> = { king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: '' };
function toAlg(p: Pos) { return String.fromCharCode(97 + p.col) + (8 - p.row); }

// --- Component ---
interface MoveRecord { notation: string; from: Pos; to: Pos; }

export default function LocalChessGame() {
  const [board, setBoard] = useState<Board>(createBoard);
  const [turn, setTurn] = useState<PieceColor>('white');
  const [selected, setSelected] = useState<Pos | null>(null);
  const [validMoves, setValidMoves] = useState<Pos[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Pos; to: Pos } | null>(null);
  const [enPassant, setEnPassant] = useState<Pos | null>(null);
  const [check, setCheck] = useState(false);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [promotion, setPromotion] = useState<{ from: Pos; to: Pos } | null>(null);

  const resetGame = useCallback(() => {
    setBoard(createBoard());
    setTurn('white');
    setSelected(null);
    setValidMoves([]);
    setLastMove(null);
    setEnPassant(null);
    setCheck(false);
    setGameOver(null);
    setMoves([]);
    setPromotion(null);
  }, []);

  const doMove = useCallback((from: Pos, to: Pos, promoPiece?: PieceType) => {
    const newBoard = cloneBoard(board);
    const piece = newBoard[from.row][from.col]!;
    const captured = newBoard[to.row][to.col];
    const isEp = piece.type === 'pawn' && enPassant && to.row === enPassant.row && to.col === enPassant.col;
    const isCastle = piece.type === 'king' && Math.abs(to.col - from.col) === 2;

    applyMove(newBoard, from, to, enPassant);

    if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
      newBoard[to.row][to.col] = { type: promoPiece || 'queen', color: piece.color, hasMoved: true };
    }

    let newEp: Pos | null = null;
    if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
      newEp = { row: (from.row + to.row) / 2, col: from.col };
    }

    // Build notation
    let notation = '';
    if (isCastle) { notation = to.col === 6 ? 'O-O' : 'O-O-O'; }
    else {
      const sym = PIECE_SYM[piece.type];
      const cap = (captured || isEp) ? 'x' : '';
      const fromFile = piece.type === 'pawn' && (captured || isEp) ? String.fromCharCode(97 + from.col) : '';
      const promo = promoPiece ? `=${PIECE_SYM[promoPiece]}` : '';
      notation = `${sym}${fromFile}${cap}${toAlg(to)}${promo}`;
    }

    const nextTurn: PieceColor = turn === 'white' ? 'black' : 'white';
    const isInCheck = inCheck(newBoard, nextTurn);
    const hasMoves = hasAnyMoves(newBoard, nextTurn, newEp);

    if (!hasMoves && isInCheck) {
      notation += '#';
      setGameOver(`Checkmate! ${turn === 'white' ? 'White' : 'Black'} wins!`);
    } else if (!hasMoves) {
      setGameOver('Stalemate! Draw.');
    } else if (isInCheck) {
      notation += '+';
    }

    setBoard(newBoard);
    setTurn(nextTurn);
    setSelected(null);
    setValidMoves([]);
    setLastMove({ from, to });
    setEnPassant(newEp);
    setCheck(isInCheck);
    setMoves(prev => [...prev, { notation, from, to }]);
  }, [board, turn, enPassant]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameOver || promotion) return;

    if (selected && validMoves.some(m => m.row === row && m.col === col)) {
      const piece = board[selected.row][selected.col];
      if (piece?.type === 'pawn' && (row === 0 || row === 7)) {
        setPromotion({ from: selected, to: { row, col } });
        return;
      }
      doMove(selected, { row, col });
      return;
    }

    const piece = board[row][col];
    if (piece && piece.color === turn) {
      setSelected({ row, col });
      setValidMoves(getLegalMoves(board, { row, col }, enPassant));
    } else {
      setSelected(null);
      setValidMoves([]);
    }
  }, [board, turn, selected, validMoves, gameOver, enPassant, doMove, promotion]);

  const handlePromotion = useCallback((type: PieceType) => {
    if (!promotion) return;
    doMove(promotion.from, promotion.to, type);
    setPromotion(null);
  }, [promotion, doMove]);

  const renderSquare = (row: number, col: number) => {
    const piece = board[row][col];
    const isLight = (row + col) % 2 === 0;
    const isSel = selected?.row === row && selected?.col === col;
    const isValid = validMoves.some(m => m.row === row && m.col === col);
    const isLast = (lastMove?.from.row === row && lastMove?.from.col === col) || (lastMove?.to.row === row && lastMove?.to.col === col);
    const isKingCheck = check && piece?.type === 'king' && piece?.color === turn;

    return (
      <div
        key={`${row}-${col}`}
        className={cn(
          'relative flex items-center justify-center cursor-pointer',
          isLight ? 'chess-square-light' : 'chess-square-dark',
          isSel && 'chess-square-selected',
          isValid && 'chess-square-valid',
          isLast && !isSel && 'chess-square-last-move',
          isKingCheck && 'chess-square-check',
        )}
        style={{ width: '100%', aspectRatio: '1' }}
        onClick={() => handleSquareClick(row, col)}
      >
        {piece && (
          <span className={cn(
            'text-[2.5rem] leading-none select-none drop-shadow-sm',
            piece.color === 'white' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-gray-900'
          )}>
            {CHESS_PIECES[piece.color]?.[piece.type]}
          </span>
        )}
        {isValid && !piece && <div className="absolute w-[30%] h-[30%] bg-black/25 rounded-full" />}
        {isValid && piece && <div className="absolute inset-0 border-[3px] border-black/25 rounded-sm" />}
        {col === 0 && <span className={cn('absolute top-0.5 left-0.5 text-[9px] font-bold', isLight ? 'text-amber-800' : 'text-amber-100')}>{8 - row}</span>}
        {row === 7 && <span className={cn('absolute bottom-0 right-0.5 text-[9px] font-bold', isLight ? 'text-amber-800' : 'text-amber-100')}>{String.fromCharCode(97 + col)}</span>}
      </div>
    );
  };

  return (
    <div className="flex h-full bg-retro-window">
      {/* Board area */}
      <div className="flex-1 flex flex-col p-2">
        {/* Status bar */}
        <div className={cn(
          'retro-panel-inset px-2 py-1 mb-2 text-[11px] font-bold text-center',
          gameOver && 'bg-yellow-100 text-yellow-800',
          check && !gameOver && 'bg-red-100 text-red-800',
        )}>
          {gameOver ? gameOver : check ? `${turn === 'white' ? 'White' : 'Black'} is in check!` : `${turn === 'white' ? 'White' : 'Black'}'s turn`}
        </div>

        {/* Black label */}
        <div className="retro-panel px-2 py-1 mb-1 text-[10px] flex justify-between">
          <span className="font-bold">Black (Player 2)</span>
          <span className={cn('px-1', turn === 'black' && !gameOver && 'bg-retro-title text-white')}>
            {turn === 'black' && !gameOver ? 'Your turn' : ''}
          </span>
        </div>

        {/* Board */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[480px]">
            <div className="retro-panel-inset p-1">
              <div className="grid grid-cols-8 gap-0 border border-black">
                {Array.from({ length: 8 }, (_, row) =>
                  Array.from({ length: 8 }, (_, col) => renderSquare(row, col))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* White label */}
        <div className="retro-panel px-2 py-1 mt-1 text-[10px] flex justify-between">
          <span className="font-bold">White (Player 1)</span>
          <span className={cn('px-1', turn === 'white' && !gameOver && 'bg-retro-title text-white')}>
            {turn === 'white' && !gameOver ? 'Your turn' : ''}
          </span>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mt-2">
          <button className="retro-button flex items-center gap-1 text-[10px]" onClick={resetGame}>
            <RotateCcw size={10} /> New Game
          </button>
        </div>
      </div>

      {/* Side panel — move history */}
      <div className="w-[160px] flex flex-col border-l border-gray-400 bg-retro-window">
        <div className="retro-title-bar text-[10px] py-0.5 px-2">Moves</div>
        <div className="flex-1 retro-panel-inset m-1 p-1 overflow-y-auto text-[10px]">
          {moves.length === 0 ? (
            <p className="text-gray-400 text-center py-2">No moves yet</p>
          ) : (
            <div className="space-y-0.5">
              {moves.map((m, i) => (
                <div key={i} className={cn('px-1', i % 2 === 0 ? 'bg-gray-50' : '')}>
                  {i % 2 === 0 && <span className="text-gray-400 mr-1">{Math.floor(i / 2) + 1}.</span>}
                  <span className="font-mono">{m.notation}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Game info */}
        <div className="p-2 border-t border-gray-400 text-[10px]">
          <div className="retro-panel-inset p-2 text-center">
            <p className="font-bold">Local Play</p>
            <p className="text-gray-500 text-[9px]">2 Players, 1 Computer</p>
            <p className="text-gray-500 text-[9px] mt-1">Take turns!</p>
          </div>
        </div>
      </div>

      {/* Promotion dialog */}
      {promotion && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-retro-window border-t-[2px] border-l-[2px] border-white border-b-[2px] border-r-[2px] border-b-black border-r-black p-1">
            <div className="retro-title-bar text-[10px] px-2 py-0.5 mb-1">Choose promotion</div>
            <div className="flex gap-1 p-2">
              {(['queen', 'rook', 'bishop', 'knight'] as PieceType[]).map(type => (
                <button
                  key={type}
                  className="retro-button !min-w-0 !px-2 !py-1 text-[24px] leading-none"
                  onClick={() => handlePromotion(type)}
                >
                  {CHESS_PIECES[turn][type]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
