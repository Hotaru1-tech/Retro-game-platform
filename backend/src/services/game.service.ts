import { prisma } from '../lib/prisma';
import { ChessEngine } from '../games/chess/engine';
import { PieceColor, posToAlgebraic } from '../games/chess/types';

// In-memory store of active game engines
const activeGames = new Map<string, ChessEngine>();

export class GameService {
  getEngine(matchId: string): ChessEngine | undefined {
    return activeGames.get(matchId);
  }

  async createMatch(roomId: string, whitePlayerId: string, blackPlayerId: string) {
    const engine = new ChessEngine();
    engine.startGame();

    const match = await prisma.match.create({
      data: {
        roomId,
        gameType: 'chess',
        whitePlayerId,
        blackPlayerId,
        status: 'IN_PROGRESS',
        boardState: engine.serializeBoard(),
      },
    });

    activeGames.set(match.id, engine);

    return { match, engine };
  }

  async processMove(
    matchId: string,
    playerId: string,
    from: { row: number; col: number },
    to: { row: number; col: number },
    promotion?: string
  ) {
    const engine = activeGames.get(matchId);
    if (!engine) throw new Error('Game engine not found');

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error('Match not found');

    // Determine player color
    let playerColor: PieceColor;
    if (playerId === match.whitePlayerId) {
      playerColor = 'white';
    } else if (playerId === match.blackPlayerId) {
      playerColor = 'black';
    } else {
      throw new Error('Player not in this match');
    }

    const result = engine.processMove(
      { from, to, promotion: promotion as any },
      playerColor
    );

    if (!result.success) {
      throw new Error(result.error || 'Invalid move');
    }

    const state = engine.getState();

    // Save move to database
    await prisma.move.create({
      data: {
        matchId,
        playerId,
        moveNum: state.moveHistory.length,
        from: posToAlgebraic(from),
        to: posToAlgebraic(to),
        piece: result.move!.piece.type,
        captured: result.move!.captured?.type || null,
        promotion: promotion || null,
        notation: result.move!.notation || '',
      },
    });

    // Update match board state
    await prisma.match.update({
      where: { id: matchId },
      data: { boardState: engine.serializeBoard() },
    });

    // If game is over, update match
    if (state.status === 'finished') {
      let matchStatus: 'CHECKMATE' | 'STALEMATE' | 'DRAW' = 'DRAW';
      if (state.isCheckmate) matchStatus = 'CHECKMATE';
      else if (state.isStalemate) matchStatus = 'STALEMATE';

      const winnerId = state.winner === 'white' ? match.whitePlayerId :
                       state.winner === 'black' ? match.blackPlayerId : null;

      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: matchStatus,
          winnerId,
          result: state.isCheckmate ? `${state.winner} wins by checkmate` :
                  state.isStalemate ? 'Draw by stalemate' : 'Draw',
          endedAt: new Date(),
        },
      });

      // Update player profiles
      if (winnerId) {
        const loserId = winnerId === match.whitePlayerId ? match.blackPlayerId : match.whitePlayerId;
        await Promise.all([
          prisma.profile.updateMany({
            where: { userId: winnerId },
            data: { gamesWon: { increment: 1 } },
          }),
          prisma.profile.updateMany({
            where: { userId: loserId },
            data: { gamesLost: { increment: 1 } },
          }),
        ]);

        // Update ELO ratings
        await this.updateElo(winnerId, loserId);
      } else {
        // Draw
        await Promise.all([
          prisma.profile.updateMany({
            where: { userId: match.whitePlayerId },
            data: { gamesDraw: { increment: 1 } },
          }),
          prisma.profile.updateMany({
            where: { userId: match.blackPlayerId },
            data: { gamesDraw: { increment: 1 } },
          }),
        ]);
      }

      // Update room status
      await prisma.room.update({
        where: { id: match.roomId },
        data: { status: 'FINISHED' },
      });

      // Cleanup engine
      activeGames.delete(matchId);
    }

    return { state: engine.getBoardForClient(), move: result.move };
  }

  async resign(matchId: string, playerId: string) {
    const engine = activeGames.get(matchId);
    if (!engine) throw new Error('Game engine not found');

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error('Match not found');

    const playerColor: PieceColor = playerId === match.whitePlayerId ? 'white' : 'black';
    engine.resign(playerColor);

    const winnerId = playerColor === 'white' ? match.blackPlayerId : match.whitePlayerId;

    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'RESIGNED',
        winnerId,
        result: `${playerColor === 'white' ? 'Black' : 'White'} wins by resignation`,
        endedAt: new Date(),
      },
    });

    await prisma.room.update({
      where: { id: match.roomId },
      data: { status: 'FINISHED' },
    });

    activeGames.delete(matchId);

    return engine.getBoardForClient();
  }

  async getMatchState(matchId: string) {
    const engine = activeGames.get(matchId);
    if (engine) return engine.getBoardForClient();

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        moves: { orderBy: { moveNum: 'asc' } },
      },
    });

    return match;
  }

  getValidMoves(matchId: string, row: number, col: number) {
    const engine = activeGames.get(matchId);
    if (!engine) return [];
    return engine.getValidMoves(row, col);
  }

  private async updateElo(winnerId: string, loserId: string) {
    const K = 32;

    const [winnerRating, loserRating] = await Promise.all([
      prisma.rating.findUnique({ where: { userId: winnerId } }),
      prisma.rating.findUnique({ where: { userId: loserId } }),
    ]);

    if (!winnerRating || !loserRating) return;

    const expectedWinner = 1 / (1 + Math.pow(10, (loserRating.elo - winnerRating.elo) / 400));
    const expectedLoser = 1 - expectedWinner;

    const newWinnerElo = Math.round(winnerRating.elo + K * (1 - expectedWinner));
    const newLoserElo = Math.round(loserRating.elo + K * (0 - expectedLoser));

    await Promise.all([
      prisma.rating.update({ where: { userId: winnerId }, data: { elo: newWinnerElo } }),
      prisma.rating.update({ where: { userId: loserId }, data: { elo: Math.max(100, newLoserElo) } }),
    ]);
  }
}

export const gameService = new GameService();
