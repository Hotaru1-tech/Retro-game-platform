import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { roomService } from '../services/room.service';
import { gameService } from '../services/game.service';
import { matchmakingService } from '../services/matchmaking.service';
import { prisma } from '../lib/prisma';
import { AuthPayload } from '../middleware/auth';

interface SocketUser {
  userId: string;
  username: string;
  socketId: string;
  roomId?: string;
}

const connectedUsers = new Map<string, SocketUser>();
const userSockets = new Map<string, string>(); // userId -> socketId
const disconnectTimers = new Map<string, NodeJS.Timeout>();

export function setupSocketHandlers(io: Server): void {
  // Auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as AuthPayload;
    console.log(`[Socket] ${user.username} connected (${socket.id})`);

    // Handle reconnection
    const existingTimer = disconnectTimers.get(user.userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      disconnectTimers.delete(user.userId);
      console.log(`[Socket] ${user.username} reconnected`);
    }

    // Register user
    connectedUsers.set(socket.id, {
      userId: user.userId,
      username: user.username,
      socketId: socket.id,
    });
    userSockets.set(user.userId, socket.id);

    // Emit online count
    io.emit('online_count', connectedUsers.size);

    // --- JOIN ROOM ---
    socket.on('join_room', async (data: { roomId: string }) => {
      try {
        const room = await roomService.joinRoom(data.roomId, user.userId);
        if (!room) return socket.emit('error', { message: 'Room not found' });

        socket.join(data.roomId);
        const socketUser = connectedUsers.get(socket.id);
        if (socketUser) socketUser.roomId = data.roomId;

        io.to(data.roomId).emit('room_updated', room);
        socket.emit('joined_room', room);
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // --- LEAVE ROOM ---
    socket.on('leave_room', async (data: { roomId: string }) => {
      try {
        const room = await roomService.leaveRoom(data.roomId, user.userId);
        socket.leave(data.roomId);

        const socketUser = connectedUsers.get(socket.id);
        if (socketUser) socketUser.roomId = undefined;

        if (room) {
          io.to(data.roomId).emit('room_updated', room);
        }
        socket.emit('left_room');
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // --- READY ---
    socket.on('ready', async (data: { roomId: string; isReady: boolean }) => {
      try {
        const room = await roomService.setReady(data.roomId, user.userId, data.isReady);
        io.to(data.roomId).emit('room_updated', room);
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // --- START GAME ---
    socket.on('start_game', async (data: { roomId: string }) => {
      try {
        const room = await roomService.getRoom(data.roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });

        if (room.players.length < 2) {
          return socket.emit('error', { message: 'Need at least 2 players' });
        }

        const allReady = room.players.every((p: any) => p.isReady);
        if (!allReady) {
          return socket.emit('error', { message: 'Not all players are ready' });
        }

        // Assign colors randomly
        const players = room.players;
        const colors = matchmakingService.assignColors(players[0].userId, players[1].userId);

        await roomService.setRoomStatus(data.roomId, 'PLAYING');

        const { match, engine } = await gameService.createMatch(
          data.roomId,
          colors.white,
          colors.black
        );

        io.to(data.roomId).emit('game_started', {
          matchId: match.id,
          whitePlayerId: colors.white,
          blackPlayerId: colors.black,
          gameState: engine.getBoardForClient(),
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // --- PLAYER MOVE ---
    socket.on('player_move', async (data: {
      matchId: string;
      from: { row: number; col: number };
      to: { row: number; col: number };
      promotion?: string;
    }) => {
      try {
        const result = await gameService.processMove(
          data.matchId,
          user.userId,
          data.from,
          data.to,
          data.promotion
        );

        // Get match to find room
        const match = await prisma.match.findUnique({ where: { id: data.matchId } });
        if (!match) return;

        io.to(match.roomId).emit('game_state_update', {
          matchId: data.matchId,
          gameState: result.state,
          lastMove: {
            from: data.from,
            to: data.to,
            notation: result.move?.notation,
          },
        });

        // Check if game is over
        if (result.state.status === 'finished') {
          io.to(match.roomId).emit('game_over', {
            matchId: data.matchId,
            winner: result.state.winner,
            isCheckmate: result.state.isCheckmate,
            isStalemate: result.state.isStalemate,
            isDraw: result.state.isDraw,
          });
        }
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // --- GET VALID MOVES ---
    socket.on('get_valid_moves', (data: { matchId: string; row: number; col: number }) => {
      const moves = gameService.getValidMoves(data.matchId, data.row, data.col);
      socket.emit('valid_moves', { row: data.row, col: data.col, moves });
    });

    // --- RESIGN ---
    socket.on('resign', async (data: { matchId: string }) => {
      try {
        const state = await gameService.resign(data.matchId, user.userId);
        const match = await prisma.match.findUnique({ where: { id: data.matchId } });
        if (!match) return;

        io.to(match.roomId).emit('game_over', {
          matchId: data.matchId,
          winner: state.winner,
          resigned: true,
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // --- MATCHMAKING ---
    socket.on('join_queue', async (data: { gameType?: string }) => {
      try {
        const rating = await prisma.rating.findUnique({ where: { userId: user.userId } });
        const elo = rating?.elo || 1200;

        const result = await matchmakingService.joinQueue(user.userId, user.username, elo);

        if (result.matched && result.roomId) {
          // Notify both players
          const opponentSocketId = userSockets.get(result.opponent || '');

          socket.join(result.roomId);
          socket.emit('match_found', { roomId: result.roomId });

          if (opponentSocketId) {
            const opponentSocket = io.sockets.sockets.get(opponentSocketId);
            if (opponentSocket) {
              opponentSocket.join(result.roomId);
              opponentSocket.emit('match_found', { roomId: result.roomId });
            }
          }
        } else {
          socket.emit('queue_joined', { position: await matchmakingService.getQueueSize() });
        }
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('leave_queue', async () => {
      await matchmakingService.leaveQueue(user.userId);
      socket.emit('queue_left');
    });

    // --- CHAT ---
    socket.on('chat_message', async (data: { roomId: string; content: string }) => {
      try {
        const message = await prisma.chatMessage.create({
          data: {
            roomId: data.roomId,
            userId: user.userId,
            content: data.content,
          },
        });

        io.to(data.roomId).emit('chat_message', {
          id: message.id,
          userId: user.userId,
          username: user.username,
          content: data.content,
          createdAt: message.createdAt,
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // --- DISCONNECT ---
    socket.on('disconnect', () => {
      console.log(`[Socket] ${user.username} disconnected (${socket.id})`);

      const socketUser = connectedUsers.get(socket.id);
      const roomId = socketUser?.roomId;

      // Give 30 seconds to reconnect
      const timer = setTimeout(async () => {
        disconnectTimers.delete(user.userId);
        userSockets.delete(user.userId);

        if (roomId) {
          try {
            const room = await roomService.leaveRoom(roomId, user.userId);
            if (room) {
              io.to(roomId).emit('room_updated', room);
              io.to(roomId).emit('player_disconnected', {
                userId: user.userId,
                username: user.username,
                permanent: true,
              });
            }
          } catch (err) {
            console.error('[Socket] Error handling disconnect:', err);
          }
        }
      }, 30000);

      disconnectTimers.set(user.userId, timer);
      connectedUsers.delete(socket.id);

      if (roomId) {
        io.to(roomId).emit('player_disconnected', {
          userId: user.userId,
          username: user.username,
          permanent: false,
        });
      }

      io.emit('online_count', connectedUsers.size);
    });

    // --- RECONNECT to game ---
    socket.on('reconnect_game', async (data: { roomId: string; matchId: string }) => {
      try {
        socket.join(data.roomId);
        const socketUser = connectedUsers.get(socket.id);
        if (socketUser) socketUser.roomId = data.roomId;

        const room = await roomService.getRoom(data.roomId);
        const state = await gameService.getMatchState(data.matchId);

        socket.emit('reconnected', { room, gameState: state });
        io.to(data.roomId).emit('player_reconnected', {
          userId: user.userId,
          username: user.username,
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });
  });
}
