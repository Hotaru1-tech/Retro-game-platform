export type PieceColor = 'white' | 'black';
export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export interface Piece {
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean;
}

export type Square = Piece | null;
export type Board = Square[][];

export interface Position {
  row: number;
  col: number;
}

export interface ChessMove {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  promotion?: PieceType;
  isCastle?: boolean;
  isEnPassant?: boolean;
  notation?: string;
}

export interface GameState {
  board: Board;
  currentTurn: PieceColor;
  moveHistory: ChessMove[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  winner: PieceColor | null;
  status: 'waiting' | 'playing' | 'finished';
  enPassantTarget: Position | null;
  halfMoveClock: number;
  fullMoveNumber: number;
  whiteTime?: number;
  blackTime?: number;
}

export interface MoveInput {
  from: { row: number; col: number };
  to: { row: number; col: number };
  promotion?: PieceType;
}

export function posToAlgebraic(pos: Position): string {
  const file = String.fromCharCode(97 + pos.col);
  const rank = (8 - pos.row).toString();
  return file + rank;
}

export function algebraicToPos(algebraic: string): Position {
  const col = algebraic.charCodeAt(0) - 97;
  const row = 8 - parseInt(algebraic[1]);
  return { row, col };
}

export const PIECE_SYMBOLS: Record<PieceType, string> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: '',
};
