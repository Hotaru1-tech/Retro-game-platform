import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);
    res.json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    res.status(401).json({ error: err.message });
  }
});

router.post('/guest', async (_req: Request, res: Response) => {
  try {
    const result = await authService.createGuest();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await authService.getProfile(req.user!.userId);
    res.json(profile);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

export default router;
