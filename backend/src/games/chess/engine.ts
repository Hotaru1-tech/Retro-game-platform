import {
  GameState, MoveInput, PieceColor, ChessMove, Board, posToAlgebraic,
} from './types';
import {
  createInitialBoard, makeMove, isInCheck, hasAnyLegalMoves,
  isInsufficientMaterial, getLegalMoves,
} from './rules';

export class ChessEngine {
  private state: GameState;

  constructor(existingState?: GameState) {
    if (existingState) {
      this.state = existingState;
    } else {
      this.state = {
        board: createInitialBoard(),
        currentTurn: 'white',
        moveHistory: [],
        isCheck: false,
        isCheckmate: false,
        isStalemate: false,
        isDraw: false,
        winner: null,
        status: 'waiting',
        enPassantTarget: null,
        halfMoveClock: 0,
        fullMoveNumber: 1,
      };
    }
  }

  getState(): GameState {
    return { ...this.state };
  }

  startGame(): void {
    this.state.status = 'playing';
  }

  processMove(input: MoveInput, playerColor: PieceColor): { success: boolean; error?: string; move?: ChessMove } {
    if (this.state.status !== 'playing') {
      return { success: false, error: 'Game is not in progress' };
    }

    if (this.state.currentTurn !== playerColor) {
      return { success: false, error: 'Not your turn' };
    }

    const piece = this.state.board[input.from.row][input.from.col];
    if (!piece) {
      return { success: false, error: 'No piece at source square' };
    }

    if (piece.color !== playerColor) {
      return { success: false, error: 'Cannot move opponent piece' };
    }

    const result = makeMove(
      this.state.board,
      input.from,
      input.to,
      this.state.enPassantTarget,
      input.promotion
    );

    if (!result) {
      return { success: false, error: 'Invalid move' };
    }

    const { newBoard, move, newEnPassant } = result;

    // Update state
    this.state.board = newBoard;
    this.state.enPassantTarget = newEnPassant;
    this.state.moveHistory.push(move);

    // Update half-move clock
    if (piece.type === 'pawn' || move.captured) {
      this.state.halfMoveClock = 0;
    } else {
      this.state.halfMoveClock++;
    }

    // Update full move number
    if (playerColor === 'black') {
      this.state.fullMoveNumber++;
    }

    // Switch turn
    const nextTurn: PieceColor = playerColor === 'white' ? 'black' : 'white';
    this.state.currentTurn = nextTurn;

    // Check game status
    this.state.isCheck = isInCheck(newBoard, nextTurn);
    const hasLegalMoves = hasAnyLegalMoves(newBoard, nextTurn, newEnPassant);

    if (!hasLegalMoves) {
      if (this.state.isCheck) {
        this.state.isCheckmate = true;
        this.state.winner = playerColor;
        this.state.status = 'finished';
        move.notation += '#';
      } else {
        this.state.isStalemate = true;
        this.state.isDraw = true;
        this.state.status = 'finished';
      }
    } else if (this.state.isCheck) {
      move.notation += '+';
    }

    // Draw conditions
    if (this.state.halfMoveClock >= 100) {
      this.state.isDraw = true;
      this.state.status = 'finished';
    }

    if (isInsufficientMaterial(newBoard)) {
      this.state.isDraw = true;
      this.state.status = 'finished';
    }

    if (this.isThreefoldRepetition()) {
      this.state.isDraw = true;
      this.state.status = 'finished';
    }

    return { success: true, move };
  }

  getValidMoves(row: number, col: number): { row: number; col: number }[] {
    return getLegalMoves(this.state.board, { row, col }, this.state.enPassantTarget);
  }

  resign(color: PieceColor): void {
    this.state.winner = color === 'white' ? 'black' : 'white';
    this.state.status = 'finished';
  }

  offerDraw(): void {
    this.state.isDraw = true;
    this.state.status = 'finished';
  }

  serializeBoard(): string {
    return JSON.stringify(this.state.board);
  }

  static deserializeBoard(data: string): Board {
    return JSON.parse(data);
  }

  getBoardForClient(): any {
    return {
      board: this.state.board,
      currentTurn: this.state.currentTurn,
      isCheck: this.state.isCheck,
      isCheckmate: this.state.isCheckmate,
      isStalemate: this.state.isStalemate,
      isDraw: this.state.isDraw,
      winner: this.state.winner,
      status: this.state.status,
      moveHistory: this.state.moveHistory.map(m => ({
        from: posToAlgebraic(m.from),
        to: posToAlgebraic(m.to),
        piece: m.piece.type,
        captured: m.captured?.type,
        notation: m.notation,
      })),
      halfMoveClock: this.state.halfMoveClock,
      fullMoveNumber: this.state.fullMoveNumber,
    };
  }

  private isThreefoldRepetition(): boolean {
    if (this.state.moveHistory.length < 8) return false;

    const boardKey = (board: Board): string =>
      board.map(row =>
        row.map(sq => sq ? `${sq.color[0]}${sq.type[0]}` : '--').join('')
      ).join('/');

    const currentKey = boardKey(this.state.board);
    let count = 1;

    // Reconstruct positions (simplified — check last few moves)
    const history = this.state.moveHistory;
    if (history.length >= 8) {
      const last = history.slice(-8);
      if (last[0].notation === last[4].notation &&
          last[1].notation === last[5].notation &&
          last[2].notation === last[6].notation &&
          last[3].notation === last[7].notation) {
        count = 3;
      }
    }

    return count >= 3;
  }
}
