import { prisma } from '../lib/prisma';
import { clerkClient } from '../lib/clerk';

export interface ClerkIdentity {
  clerkUserId: string;
}

export class AuthService {
  async syncClerkUser(identity: ClerkIdentity) {
    const clerkUser = await clerkClient.users.getUser(identity.clerkUserId);
    const primaryEmail =
      clerkUser.primaryEmailAddressId
        ? clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress
        : clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      throw new Error('Clerk user does not have a primary email address');
    }

    const desiredUsername = this.buildUsername(
      clerkUser.username ||
        clerkUser.firstName ||
        primaryEmail.split('@')[0] ||
        'player',
      clerkUser.id,
    );

    const existingByClerkId = await prisma.user.findUnique({
      where: { clerkId: identity.clerkUserId },
      include: { profile: true, rating: true },
    });

    if (existingByClerkId) {
      const nextUsername =
        existingByClerkId.username === desiredUsername
          ? existingByClerkId.username
          : await this.ensureUniqueUsername(desiredUsername, existingByClerkId.id);

      return prisma.user.update({
        where: { id: existingByClerkId.id },
        data: {
          email: primaryEmail,
          username: nextUsername,
          password: null,
        },
        include: { profile: true, rating: true },
      });
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email: primaryEmail },
      include: { profile: true, rating: true },
    });

    if (existingByEmail) {
      const nextUsername = await this.ensureUniqueUsername(desiredUsername, existingByEmail.id);
      return prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          clerkId: identity.clerkUserId,
          email: primaryEmail,
          username: nextUsername,
          password: null,
        },
        include: { profile: true, rating: true },
      });
    }

    const username = await this.ensureUniqueUsername(desiredUsername);

    return prisma.user.create({
      data: {
        clerkId: identity.clerkUserId,
        username,
        email: primaryEmail,
        password: null,
        profile: { create: {} },
        rating: { create: { elo: 1200 } },
      },
      include: { profile: true, rating: true },
    });
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
      clerkId: user.clerkId,
      profile: user.profile,
      rating: user.rating,
      recentMatches: [...user.matchesW, ...user.matchesB]
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, 10),
    };
  }

  private buildUsername(rawValue: string, clerkUserId: string) {
    const cleaned = rawValue.toLowerCase().replace(/[^a-z0-9_]+/g, '-').replace(/^-+|-+$/g, '');
    return cleaned || `player-${clerkUserId.slice(-6).toLowerCase()}`;
  }

  private async ensureUniqueUsername(username: string, currentUserId?: string) {
    let candidate = username;
    let attempt = 1;

    while (true) {
      const existing = await prisma.user.findUnique({ where: { username: candidate } });
      if (!existing || existing.id === currentUserId) {
        return candidate;
      }
      candidate = `${username}-${attempt}`;
      attempt += 1;
    }
  }
}

export const authService = new AuthService();
