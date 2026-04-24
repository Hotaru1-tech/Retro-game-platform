import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Get developer status
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId!;
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const subscription = await prisma.developerSubscription.findUnique({ where: { userId } });

    // Check if subscription expired
    if (subscription && subscription.status === 'ACTIVE' && new Date(subscription.endDate) < new Date()) {
      await prisma.developerSubscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' },
      });
      await prisma.profile.update({
        where: { userId },
        data: { isDeveloper: false },
      });
      res.json({ isDeveloper: false, subscription: { ...subscription, status: 'EXPIRED' } });
      return;
    }

    res.json({
      isDeveloper: profile?.isDeveloper || false,
      subscription: subscription || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Subscribe to developer mode
const subscribeSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
});

router.post('/subscribe', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    subscribeSchema.parse(req.body);
    res.status(410).json({
      error: 'Developer subscriptions now use the payments flow. Use /api/payments/init followed by /api/payments/confirm.',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid plan. Choose "monthly" or "yearly".' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// Cancel subscription
router.post('/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId!;
    const subscription = await prisma.developerSubscription.findUnique({ where: { userId } });
    if (!subscription) {
      res.status(404).json({ error: 'No active subscription' });
      return;
    }

    await prisma.developerSubscription.update({
      where: { userId },
      data: { status: 'CANCELLED' },
    });

    await prisma.profile.update({
      where: { userId },
      data: { isDeveloper: false },
    });

    // Unpublish all games
    await prisma.customGame.updateMany({
      where: { ownerId: userId },
      data: { isPublished: false },
    });

    res.json({ message: 'Developer mode cancelled', isDeveloper: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Custom Games CRUD ---

// Create game
const createGameSchema = z.object({
  title: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
  icon: z.string().optional(),
  gameUrl: z.string().url(),
  gameType: z.enum(['iframe', 'link']).optional(),
});

router.post('/games', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId!;
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile?.isDeveloper) {
      res.status(403).json({ error: 'Developer mode required' });
      return;
    }

    const data = createGameSchema.parse(req.body);

    const game = await prisma.customGame.create({
      data: {
        ownerId: userId,
        title: data.title,
        description: data.description || '',
        icon: data.icon || 'Gamepad2',
        gameUrl: data.gameUrl,
        gameType: data.gameType || 'iframe',
        isPublished: false,
      },
    });

    res.json(game);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// Update game (owner only)
const updateGameSchema = z.object({
  title: z.string().min(2).max(50).optional(),
  description: z.string().max(200).optional(),
  icon: z.string().optional(),
  gameUrl: z.string().url().optional(),
  gameType: z.enum(['iframe', 'link']).optional(),
  isPublished: z.boolean().optional(),
});

router.put('/games/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId!;
    const game = await prisma.customGame.findUnique({ where: { id: req.params.id } });

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    if (game.ownerId !== userId) {
      res.status(403).json({ error: 'You can only edit your own games' });
      return;
    }

    const data = updateGameSchema.parse(req.body);
    const updated = await prisma.customGame.update({
      where: { id: req.params.id },
      data,
    });

    res.json(updated);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete game (owner only)
router.delete('/games/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId!;
    const game = await prisma.customGame.findUnique({ where: { id: req.params.id } });

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    if (game.ownerId !== userId) {
      res.status(403).json({ error: 'You can only delete your own games' });
      return;
    }

    await prisma.customGame.delete({ where: { id: req.params.id } });
    res.json({ message: 'Game deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List my games (developer)
router.get('/games/mine', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const games = await prisma.customGame.findMany({
      where: { ownerId: req.user!.userId! },
      orderBy: { createdAt: 'desc' },
    });
    res.json(games);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List all published community games (public)
router.get('/games/community', async (_req: AuthRequest, res: Response) => {
  try {
    const games = await prisma.customGame.findMany({
      where: { isPublished: true },
      include: { owner: { select: { username: true } } },
      orderBy: { plays: 'desc' },
    });
    res.json(games);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Increment play count
router.post('/games/:id/play', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.customGame.update({
      where: { id: req.params.id },
      data: { plays: { increment: 1 } },
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
