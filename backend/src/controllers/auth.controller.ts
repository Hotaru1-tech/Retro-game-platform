import { Router, Response } from 'express';
import { authService } from '../services/auth.service';
import { authMiddleware, clerkAuthMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/sync', clerkAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await authService.syncClerkUser({ clerkUserId: req.user!.clerkId! });
    const profile = await authService.getProfile(user.id);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await authService.getProfile(req.user!.userId!);
    res.json(profile);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
