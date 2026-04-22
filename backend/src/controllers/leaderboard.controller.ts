import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const offset = (page - 1) * limit;

    const ratings = await prisma.rating.findMany({
      orderBy: { elo: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                gamesWon: true,
                gamesLost: true,
                gamesDraw: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    const total = await prisma.rating.count();

    const leaderboard = ratings.map((r, index) => ({
      rank: offset + index + 1,
      userId: r.user.id,
      username: r.user.username,
      elo: r.elo,
      gamesWon: r.user.profile?.gamesWon || 0,
      gamesLost: r.user.profile?.gamesLost || 0,
      gamesDraw: r.user.profile?.gamesDraw || 0,
      avatar: r.user.profile?.avatar,
    }));

    res.json({ leaderboard, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const rating = await prisma.rating.findUnique({
      where: { userId: req.params.userId },
      include: {
        user: {
          select: {
            username: true,
            profile: true,
          },
        },
      },
    });

    if (!rating) {
      res.status(404).json({ error: 'Rating not found' });
      return;
    }

    // Get rank
    const rank = await prisma.rating.count({
      where: { elo: { gt: rating.elo } },
    });

    res.json({
      rank: rank + 1,
      userId: req.params.userId,
      username: rating.user.username,
      elo: rating.elo,
      profile: rating.user.profile,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
