import { redisClient } from '../lib/redis';
import { roomService } from './room.service';

const QUEUE_KEY = 'matchmaking:chess:queue';
const QUEUE_TIMEOUT = 120; // seconds

interface QueueEntry {
  userId: string;
  username: string;
  elo: number;
  joinedAt: number;
}

export class MatchmakingService {
  private localQueue: QueueEntry[] = [];

  async joinQueue(userId: string, username: string, elo: number): Promise<{ matched: boolean; roomId?: string; opponent?: string }> {
    const entry: QueueEntry = { userId, username, elo, joinedAt: Date.now() };

    // Try to find a match
    const match = await this.findMatch(entry);

    if (match) {
      // Create room and return
      const room = await roomService.createRoom(match.userId, 'chess');
      await roomService.joinRoom(room.id, userId);

      // Set both players ready
      await roomService.setReady(room.id, match.userId, true);
      await roomService.setReady(room.id, userId, true);

      return { matched: true, roomId: room.id, opponent: match.username };
    }

    // No match found, add to queue
    await this.addToQueue(entry);
    return { matched: false };
  }

  async leaveQueue(userId: string): Promise<void> {
    this.localQueue = this.localQueue.filter(e => e.userId !== userId);

    try {
      const members = await redisClient.smembers(QUEUE_KEY);
      for (const member of members) {
        const entry: QueueEntry = JSON.parse(member);
        if (entry.userId === userId) {
          await redisClient.srem(QUEUE_KEY, member);
          break;
        }
      }
    } catch {
      // Redis unavailable, local queue already updated
    }
  }

  async getQueueSize(): Promise<number> {
    try {
      return await redisClient.scard(QUEUE_KEY);
    } catch {
      return this.localQueue.length;
    }
  }

  private async findMatch(entry: QueueEntry): Promise<QueueEntry | null> {
    // Try Redis first
    try {
      const members = await redisClient.smembers(QUEUE_KEY);

      for (const member of members) {
        const candidate: QueueEntry = JSON.parse(member);

        if (candidate.userId === entry.userId) continue;

        // Check if expired
        if (Date.now() - candidate.joinedAt > QUEUE_TIMEOUT * 1000) {
          await redisClient.srem(QUEUE_KEY, member);
          continue;
        }

        // ELO range matching (within 200 points)
        if (Math.abs(candidate.elo - entry.elo) <= 200) {
          await redisClient.srem(QUEUE_KEY, member);
          return candidate;
        }
      }

      // Wider match if waiting > 30s
      for (const member of members) {
        const candidate: QueueEntry = JSON.parse(member);
        if (candidate.userId === entry.userId) continue;

        if (Date.now() - candidate.joinedAt > 30000) {
          await redisClient.srem(QUEUE_KEY, member);
          return candidate;
        }
      }
    } catch {
      // Fallback to local queue
    }

    // Try local queue
    const now = Date.now();
    this.localQueue = this.localQueue.filter(e => now - e.joinedAt < QUEUE_TIMEOUT * 1000);

    for (let i = 0; i < this.localQueue.length; i++) {
      const candidate = this.localQueue[i];
      if (candidate.userId === entry.userId) continue;

      if (Math.abs(candidate.elo - entry.elo) <= 200 || now - candidate.joinedAt > 30000) {
        this.localQueue.splice(i, 1);
        return candidate;
      }
    }

    return null;
  }

  private async addToQueue(entry: QueueEntry): Promise<void> {
    try {
      await redisClient.sadd(QUEUE_KEY, JSON.stringify(entry));
      await redisClient.expire(QUEUE_KEY, QUEUE_TIMEOUT);
    } catch {
      // Fallback to local queue
    }

    this.localQueue.push(entry);
  }

  assignColors(player1Id: string, player2Id: string): { white: string; black: string } {
    if (Math.random() < 0.5) {
      return { white: player1Id, black: player2Id };
    }
    return { white: player2Id, black: player1Id };
  }
}

export const matchmakingService = new MatchmakingService();
