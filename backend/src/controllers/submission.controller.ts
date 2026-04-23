import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest, requireDeveloper, requireAdmin } from '../middleware/auth';
import { performFullScan } from '../services/security-scanner';

const router = Router();

// === DEVELOPER ENDPOINTS ===

// Submit a new game
const submitSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  manifest: z.string().optional(),
  sourceFiles: z.record(z.string()).optional(),
  gameUrl: z.string().url().optional(),
  mode: z.enum(['singleplayer', 'multiplayer', 'both']).optional(),
  minPlayers: z.number().min(1).max(100).optional(),
  maxPlayers: z.number().min(1).max(100).optional(),
  icon: z.string().optional(),
});

router.post('/submit', authMiddleware, requireDeveloper, async (req: AuthRequest, res: Response) => {
  try {
    const data = submitSchema.parse(req.body);
    const userId = req.user!.userId!;

    // Check slug uniqueness
    const existing = await prisma.gameSubmission.findUnique({ where: { slug: data.slug } });
    if (existing) {
      res.status(400).json({ error: 'A game with this slug already exists' });
      return;
    }

    // Run security scan
    const manifest = data.manifest || JSON.stringify({ name: data.name, version: data.version || '1.0.0', entry: data.gameUrl || 'index.html' });
    const sourceFiles = data.sourceFiles || {};
    const scanResult = performFullScan(manifest, sourceFiles);

    const submission = await prisma.gameSubmission.create({
      data: {
        developerId: userId,
        name: data.name,
        slug: data.slug,
        description: data.description || '',
        version: data.version || '1.0.0',
        manifest,
        sourceFiles: JSON.stringify(sourceFiles),
        gameUrl: data.gameUrl || '',
        mode: data.mode || 'singleplayer',
        minPlayers: data.minPlayers || 1,
        maxPlayers: data.maxPlayers || 1,
        icon: data.icon || 'Gamepad2',
        status: scanResult.passed ? 'PENDING' : 'REJECTED',
        scanResult: JSON.stringify(scanResult),
        rejectReason: scanResult.passed ? null : `Auto-rejected: ${scanResult.errors.join('; ')}`,
      },
    });

    res.json({
      submission,
      scanResult,
      message: scanResult.passed
        ? 'Game submitted for review!'
        : 'Game rejected by security scan. Fix the issues and resubmit.',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// List my submissions
router.get('/my-games', authMiddleware, requireDeveloper, async (req: AuthRequest, res: Response) => {
  try {
    const games = await prisma.gameSubmission.findMany({
      where: { developerId: req.user!.userId! },
      orderBy: { createdAt: 'desc' },
      include: { reviews: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    res.json(games);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update my submission (only if PENDING or REJECTED)
const updateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
  manifest: z.string().optional(),
  sourceFiles: z.record(z.string()).optional(),
  gameUrl: z.string().url().optional(),
  mode: z.enum(['singleplayer', 'multiplayer', 'both']).optional(),
  minPlayers: z.number().min(1).max(100).optional(),
  maxPlayers: z.number().min(1).max(100).optional(),
  icon: z.string().optional(),
});

router.put('/my-games/:id', authMiddleware, requireDeveloper, async (req: AuthRequest, res: Response) => {
  try {
    const game = await prisma.gameSubmission.findUnique({ where: { id: req.params.id } });
    if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
    if (game.developerId !== req.user!.userId!) { res.status(403).json({ error: 'Not your game' }); return; }
    if (game.status !== 'PENDING' && game.status !== 'REJECTED') {
      res.status(400).json({ error: 'Can only edit pending or rejected submissions' });
      return;
    }

    const data = updateSchema.parse(req.body);

    // Re-scan if source changed
    let scanResult = JSON.parse(game.scanResult);
    if (data.manifest || data.sourceFiles) {
      const manifest = data.manifest || game.manifest;
      const sourceFiles = data.sourceFiles || JSON.parse(game.sourceFiles);
      scanResult = performFullScan(manifest, sourceFiles);
    }

    const updated = await prisma.gameSubmission.update({
      where: { id: req.params.id },
      data: {
        ...data,
        sourceFiles: data.sourceFiles ? JSON.stringify(data.sourceFiles) : undefined,
        status: 'PENDING',
        scanResult: JSON.stringify(scanResult),
        rejectReason: scanResult.passed ? null : `Auto-rejected: ${scanResult.errors.join('; ')}`,
      },
    });

    res.json({ submission: updated, scanResult });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete my submission
router.delete('/my-games/:id', authMiddleware, requireDeveloper, async (req: AuthRequest, res: Response) => {
  try {
    const game = await prisma.gameSubmission.findUnique({ where: { id: req.params.id } });
    if (!game) { res.status(404).json({ error: 'Game not found' }); return; }
    if (game.developerId !== req.user!.userId!) { res.status(403).json({ error: 'Not your game' }); return; }

    await prisma.gameSubmission.delete({ where: { id: req.params.id } });
    res.json({ message: 'Game deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// === ADMIN ENDPOINTS ===

// List all submissions for review
router.get('/admin/pending', authMiddleware, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const games = await prisma.gameSubmission.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: { developer: { select: { id: true, username: true, email: true } } },
    });
    res.json(games);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List all submissions (any status)
router.get('/admin/all', authMiddleware, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const games = await prisma.gameSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      include: { developer: { select: { id: true, username: true } } },
    });
    res.json(games);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Approve / Reject / Disable a submission
const reviewSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED', 'DISABLED']),
  comment: z.string().max(500).optional(),
});

router.post('/admin/review/:id', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { action, comment } = reviewSchema.parse(req.body);
    const game = await prisma.gameSubmission.findUnique({ where: { id: req.params.id } });
    if (!game) { res.status(404).json({ error: 'Submission not found' }); return; }

    // Update status
    await prisma.gameSubmission.update({
      where: { id: req.params.id },
      data: {
        status: action,
        rejectReason: action === 'REJECTED' ? (comment || 'Rejected by admin') : null,
      },
    });

    // Log the review
    await prisma.reviewLog.create({
      data: {
        submissionId: req.params.id,
        reviewerId: req.user!.userId!,
        action,
        comment: comment || '',
      },
    });

    res.json({ message: `Game ${action.toLowerCase()}`, status: action });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// Get review history for a submission
router.get('/admin/reviews/:id', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const reviews = await prisma.reviewLog.findMany({
      where: { submissionId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { reviewer: { select: { username: true } } },
    });
    res.json(reviews);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// === PUBLIC: Approved games ===

router.get('/approved', async (_req: AuthRequest, res: Response) => {
  try {
    const games = await prisma.gameSubmission.findMany({
      where: { status: 'APPROVED' },
      orderBy: { plays: 'desc' },
      include: { developer: { select: { username: true } } },
    });
    res.json(games);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Increment play count for approved game
router.post('/play/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.gameSubmission.update({
      where: { id: req.params.id },
      data: { plays: { increment: 1 } },
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// === ADMIN: Manage user roles ===

router.post('/admin/set-role', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, role } = z.object({
      userId: z.string(),
      role: z.enum(['PLAYER', 'DEVELOPER', 'ADMIN']),
    }).parse(req.body);

    await prisma.user.update({ where: { id: userId }, data: { role } });
    if (role === 'DEVELOPER') {
      await prisma.profile.updateMany({ where: { userId }, data: { isDeveloper: true } });
    }

    res.json({ message: `User role set to ${role}` });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
