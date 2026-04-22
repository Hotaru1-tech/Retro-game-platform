import {
  Board, Piece, PieceColor, PieceType, Position, ChessMove, Square,
  posToAlgebraic, PIECE_SYMBOLS,
} from './types';

export function createInitialBoard(): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

  const backRank: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRank[col], color: 'black' };
    board[1][col] = { type: 'pawn', color: 'black' };
    board[6][col] = { type: 'pawn', color: 'white' };
    board[7][col] = { type: backRank[col], color: 'white' };
  }

  return board;
}

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(sq => (sq ? { ...sq } : null)));
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function findKing(board: Board, color: PieceColor): Position | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

export function isSquareAttacked(board: Board, pos: Position, byColor: PieceColor): boolean {
  // Check pawn attacks
  const pawnDir = byColor === 'white' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const r = pos.row + pawnDir;
    const c = pos.col + dc;
    if (isInBounds(r, c)) {
      const p = board[r][c];
      if (p && p.color === byColor && p.type === 'pawn') return true;
    }
  }

  // Knight attacks
  const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  for (const [dr, dc] of knightMoves) {
    const r = pos.row + dr;
    const c = pos.col + dc;
    if (isInBounds(r, c)) {
      const p = board[r][c];
      if (p && p.color === byColor && p.type === 'knight') return true;
    }
  }

  // King attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = pos.row + dr;
      const c = pos.col + dc;
      if (isInBounds(r, c)) {
        const p = board[r][c];
        if (p && p.color === byColor && p.type === 'king') return true;
      }
    }
  }

  // Sliding pieces: rook/queen (straight), bishop/queen (diagonal)
  const straightDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [dr, dc] of straightDirs) {
    for (let i = 1; i < 8; i++) {
      const r = pos.row + dr * i;
      const c = pos.col + dc * i;
      if (!isInBounds(r, c)) break;
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === 'rook' || p.type === 'queen')) return true;
        break;
      }
    }
  }

  const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [dr, dc] of diagDirs) {
    for (let i = 1; i < 8; i++) {
      const r = pos.row + dr * i;
      const c = pos.col + dc * i;
      if (!isInBounds(r, c)) break;
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === 'bishop' || p.type === 'queen')) return true;
        break;
      }
    }
  }

  return false;
}

export function isInCheck(board: Board, color: PieceColor): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  const opponent = color === 'white' ? 'black' : 'white';
  return isSquareAttacked(board, kingPos, opponent);
}

function getRawMoves(board: Board, from: Position, enPassantTarget: Position | null): Position[] {
  const piece = board[from.row][from.col];
  if (!piece) return [];

  const moves: Position[] = [];
  const { type, color } = piece;

  switch (type) {
    case 'pawn': {
      const dir = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;

      // Forward
      const fwd = from.row + dir;
      if (isInBounds(fwd, from.col) && !board[fwd][from.col]) {
        moves.push({ row: fwd, col: from.col });
        // Double move
        const dbl = from.row + dir * 2;
        if (from.row === startRow && !board[dbl][from.col]) {
          moves.push({ row: dbl, col: from.col });
        }
      }

      // Captures
      for (const dc of [-1, 1]) {
        const nr = from.row + dir;
        const nc = from.col + dc;
        if (isInBounds(nr, nc)) {
          const target = board[nr][nc];
          if (target && target.color !== color) {
            moves.push({ row: nr, col: nc });
          }
          // En passant
          if (enPassantTarget && enPassantTarget.row === nr && enPassantTarget.col === nc) {
            moves.push({ row: nr, col: nc });
          }
        }
      }
      break;
    }

    case 'knight': {
      const knightOffsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      for (const [dr, dc] of knightOffsets) {
        const nr = from.row + dr;
        const nc = from.col + dc;
        if (isInBounds(nr, nc)) {
          const target = board[nr][nc];
          if (!target || target.color !== color) {
            moves.push({ row: nr, col: nc });
          }
        }
      }
      break;
    }

    case 'bishop': {
      const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [dr, dc] of diagDirs) {
        for (let i = 1; i < 8; i++) {
          const nr = from.row + dr * i;
          const nc = from.col + dc * i;
          if (!isInBounds(nr, nc)) break;
          const target = board[nr][nc];
          if (!target) {
            moves.push({ row: nr, col: nc });
          } else {
            if (target.color !== color) moves.push({ row: nr, col: nc });
            break;
          }
        }
      }
      break;
    }

    case 'rook': {
      const straightDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dr, dc] of straightDirs) {
        for (let i = 1; i < 8; i++) {
          const nr = from.row + dr * i;
          const nc = from.col + dc * i;
          if (!isInBounds(nr, nc)) break;
          const target = board[nr][nc];
          if (!target) {
            moves.push({ row: nr, col: nc });
          } else {
            if (target.color !== color) moves.push({ row: nr, col: nc });
            break;
          }
        }
      }
      break;
    }

    case 'queen': {
      const allDirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [dr, dc] of allDirs) {
        for (let i = 1; i < 8; i++) {
          const nr = from.row + dr * i;
          const nc = from.col + dc * i;
          if (!isInBounds(nr, nc)) break;
          const target = board[nr][nc];
          if (!target) {
            moves.push({ row: nr, col: nc });
          } else {
            if (target.color !== color) moves.push({ row: nr, col: nc });
            break;
          }
        }
      }
      break;
    }

    case 'king': {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = from.row + dr;
          const nc = from.col + dc;
          if (isInBounds(nr, nc)) {
            const target = board[nr][nc];
            if (!target || target.color !== color) {
              moves.push({ row: nr, col: nc });
            }
          }
        }
      }

      // Castling
      if (!piece.hasMoved) {
        const row = from.row;
        const opponent = color === 'white' ? 'black' : 'white';

        // Kingside
        const kRook = board[row][7];
        if (kRook && kRook.type === 'rook' && kRook.color === color && !kRook.hasMoved) {
          if (!board[row][5] && !board[row][6]) {
            if (!isSquareAttacked(board, { row, col: 4 }, opponent) &&
                !isSquareAttacked(board, { row, col: 5 }, opponent) &&
                !isSquareAttacked(board, { row, col: 6 }, opponent)) {
              moves.push({ row, col: 6 });
            }
          }
        }

        // Queenside
        const qRook = board[row][0];
        if (qRook && qRook.type === 'rook' && qRook.color === color && !qRook.hasMoved) {
          if (!board[row][1] && !board[row][2] && !board[row][3]) {
            if (!isSquareAttacked(board, { row, col: 4 }, opponent) &&
                !isSquareAttacked(board, { row, col: 3 }, opponent) &&
                !isSquareAttacked(board, { row, col: 2 }, opponent)) {
              moves.push({ row, col: 2 });
            }
          }
        }
      }
      break;
    }
  }

  return moves;
}

export function getLegalMoves(board: Board, from: Position, enPassantTarget: Position | null): Position[] {
  const piece = board[from.row][from.col];
  if (!piece) return [];

  const rawMoves = getRawMoves(board, from, enPassantTarget);
  const legalMoves: Position[] = [];

  for (const to of rawMoves) {
    const testBoard = cloneBoard(board);
    applyMoveOnBoard(testBoard, from, to, piece, enPassantTarget);
    if (!isInCheck(testBoard, piece.color)) {
      legalMoves.push(to);
    }
  }

  return legalMoves;
}

function applyMoveOnBoard(board: Board, from: Position, to: Position, piece: Piece, enPassantTarget: Position | null): void {
  // En passant capture
  if (piece.type === 'pawn' && enPassantTarget &&
      to.row === enPassantTarget.row && to.col === enPassantTarget.col) {
    const capturedRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
    board[capturedRow][to.col] = null;
  }

  // Castling
  if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
    if (to.col === 6) {
      board[from.row][5] = board[from.row][7];
      board[from.row][7] = null;
      if (board[from.row][5]) board[from.row][5]!.hasMoved = true;
    } else if (to.col === 2) {
      board[from.row][3] = board[from.row][0];
      board[from.row][0] = null;
      if (board[from.row][3]) board[from.row][3]!.hasMoved = true;
    }
  }

  board[to.row][to.col] = { ...piece, hasMoved: true };
  board[from.row][from.col] = null;
}

export function isValidMove(board: Board, from: Position, to: Position, enPassantTarget: Position | null): boolean {
  const piece = board[from.row][from.col];
  if (!piece) return false;

  const legalMoves = getLegalMoves(board, from, enPassantTarget);
  return legalMoves.some(m => m.row === to.row && m.col === to.col);
}

export function hasAnyLegalMoves(board: Board, color: PieceColor, enPassantTarget: Position | null): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const moves = getLegalMoves(board, { row: r, col: c }, enPassantTarget);
        if (moves.length > 0) return true;
      }
    }
  }
  return false;
}

export function makeMove(
  board: Board,
  from: Position,
  to: Position,
  enPassantTarget: Position | null,
  promotion?: PieceType
): { newBoard: Board; move: ChessMove; newEnPassant: Position | null } | null {
  const piece = board[from.row][from.col];
  if (!piece) return null;

  if (!isValidMove(board, from, to, enPassantTarget)) return null;

  const newBoard = cloneBoard(board);
  const captured = newBoard[to.row][to.col];

  const isEnPassant = piece.type === 'pawn' && enPassantTarget &&
    to.row === enPassantTarget.row && to.col === enPassantTarget.col;

  const isCastle = piece.type === 'king' && Math.abs(to.col - from.col) === 2;

  let capturedPiece = captured;
  if (isEnPassant) {
    const capturedRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
    capturedPiece = newBoard[capturedRow][to.col];
  }

  applyMoveOnBoard(newBoard, from, to, piece, enPassantTarget);

  // Promotion
  if (piece.type === 'pawn' && (to.row === 0 || to.row === 7)) {
    const promType = promotion || 'queen';
    newBoard[to.row][to.col] = { type: promType, color: piece.color, hasMoved: true };
  }

  // New en passant target
  let newEnPassant: Position | null = null;
  if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
    newEnPassant = { row: (from.row + to.row) / 2, col: from.col };
  }

  // Build notation
  let notation = '';
  if (isCastle) {
    notation = to.col === 6 ? 'O-O' : 'O-O-O';
  } else {
    const symbol = PIECE_SYMBOLS[piece.type];
    const captureStr = capturedPiece ? 'x' : '';
    const fromStr = piece.type === 'pawn' && capturedPiece
      ? String.fromCharCode(97 + from.col) : '';
    const toStr = posToAlgebraic(to);
    const promoStr = promotion ? `=${PIECE_SYMBOLS[promotion]}` : '';
    notation = `${symbol}${fromStr}${captureStr}${toStr}${promoStr}`;
  }

  const move: ChessMove = {
    from,
    to,
    piece: { ...piece },
    captured: capturedPiece || undefined,
    promotion,
    isCastle: isCastle || undefined,
    isEnPassant: isEnPassant ? true : undefined,
    notation,
  };

  return { newBoard, move, newEnPassant };
}

export function isInsufficientMaterial(board: Board): boolean {
  const pieces: { type: PieceType; color: PieceColor; pos: Position }[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) pieces.push({ type: p.type, color: p.color, pos: { row: r, col: c } });
    }
  }

  // K vs K
  if (pieces.length === 2) return true;

  // K+B vs K or K+N vs K
  if (pieces.length === 3) {
    const nonKing = pieces.find(p => p.type !== 'king');
    if (nonKing && (nonKing.type === 'bishop' || nonKing.type === 'knight')) return true;
  }

  // K+B vs K+B (same color bishops)
  if (pieces.length === 4) {
    const bishops = pieces.filter(p => p.type === 'bishop');
    if (bishops.length === 2 && bishops[0].color !== bishops[1].color) {
      const color1 = (bishops[0].pos.row + bishops[0].pos.col) % 2;
      const color2 = (bishops[1].pos.row + bishops[1].pos.col) % 2;
      if (color1 === color2) return true;
    }
  }

  return false;
}
