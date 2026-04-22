import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
    });

    if (existing) {
      throw new Error('User with this email or username already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        password: hashedPassword,
        profile: { create: {} },
        rating: { create: { elo: 1200 } },
      },
      include: { profile: true, rating: true },
    });

    const token = this.generateToken(user.id, user.username);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        rating: user.rating,
      },
      token,
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { profile: true, rating: true },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(input.password, user.password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user.id, user.username);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        rating: user.rating,
      },
      token,
    };
  }

  async createGuest() {
    const guestName = `Guest_${Math.random().toString(36).substring(2, 8)}`;
    const guestEmail = `${guestName.toLowerCase()}@guest.local`;

    const user = await prisma.user.create({
      data: {
        username: guestName,
        email: guestEmail,
        password: '',
        isGuest: true,
        profile: { create: {} },
        rating: { create: { elo: 1200 } },
      },
      include: { profile: true, rating: true },
    });

    const token = this.generateToken(user.id, user.username);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isGuest: true,
        profile: user.profile,
        rating: user.rating,
      },
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        rating: true,
        matchesW: { take: 10, orderBy: { startedAt: 'desc' } },
        matchesB: { take: 10, orderBy: { startedAt: 'desc' } },
      },
    });

    if (!user) throw new Error('User not found');

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      profile: user.profile,
      rating: user.rating,
      recentMatches: [...user.matchesW, ...user.matchesB]
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, 10),
    };
  }

  private generateToken(userId: string, username: string, role: string = 'PLAYER'): string {
    return jwt.sign({ userId, username, role }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any,
    });
  }
}

export const authService = new AuthService();
