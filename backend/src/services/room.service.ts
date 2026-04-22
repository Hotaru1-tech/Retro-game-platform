import { prisma } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export class RoomService {
  async createRoom(userId: string, gameType: string = 'chess') {
    const code = uuidv4().substring(0, 8).toUpperCase();

    const room = await prisma.room.create({
      data: {
        code,
        gameType,
        status: 'WAITING',
        players: {
          create: {
            userId,
            isHost: true,
            isReady: false,
          },
        },
      },
      include: {
        players: { include: { user: { select: { id: true, username: true } } } },
      },
    });

    return room;
  }

  async joinRoom(roomId: string, userId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true },
    });

    if (!room) throw new Error('Room not found');
    if (room.status !== 'WAITING') throw new Error('Room is not accepting players');
    if (room.players.length >= room.maxPlayers) throw new Error('Room is full');

    const alreadyJoined = room.players.find(p => p.userId === userId);
    if (alreadyJoined) return this.getRoom(roomId);

    await prisma.roomPlayer.create({
      data: { roomId, userId, isHost: false, isReady: false },
    });

    return this.getRoom(roomId);
  }

  async joinRoomByCode(code: string, userId: string) {
    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) throw new Error('Room not found');
    return this.joinRoom(room.id, userId);
  }

  async leaveRoom(roomId: string, userId: string) {
    await prisma.roomPlayer.deleteMany({
      where: { roomId, userId },
    });

    const remaining = await prisma.roomPlayer.findMany({ where: { roomId } });

    if (remaining.length === 0) {
      await prisma.room.delete({ where: { id: roomId } });
      return null;
    }

    // Transfer host if needed
    const hasHost = remaining.some(p => p.isHost);
    if (!hasHost && remaining.length > 0) {
      await prisma.roomPlayer.update({
        where: { id: remaining[0].id },
        data: { isHost: true },
      });
    }

    return this.getRoom(roomId);
  }

  async setReady(roomId: string, userId: string, isReady: boolean) {
    await prisma.roomPlayer.updateMany({
      where: { roomId, userId },
      data: { isReady },
    });

    return this.getRoom(roomId);
  }

  async getRoom(roomId: string) {
    return prisma.room.findUnique({
      where: { id: roomId },
      include: {
        players: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
        match: true,
      },
    });
  }

  async getRoomByCode(code: string) {
    return prisma.room.findUnique({
      where: { code },
      include: {
        players: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });
  }

  async getActiveRooms() {
    return prisma.room.findMany({
      where: { status: 'WAITING' },
      include: {
        players: {
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async allPlayersReady(roomId: string): Promise<boolean> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true },
    });

    if (!room || room.players.length < 2) return false;
    return room.players.every(p => p.isReady);
  }

  async setRoomStatus(roomId: string, status: 'WAITING' | 'PLAYING' | 'FINISHED') {
    return prisma.room.update({
      where: { id: roomId },
      data: { status },
    });
  }
}

export const roomService = new RoomService();
