import { Router, Response } from 'express';
import { roomService } from '../services/room.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { gameType } = req.body;
    const room = await roomService.createRoom(req.user!.userId, gameType || 'chess');
    res.json(room);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/active', async (_req: AuthRequest, res: Response) => {
  try {
    const rooms = await roomService.getActiveRooms();
    res.json(rooms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const room = await roomService.getRoom(req.params.id);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json(room);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/code/:code', async (req: AuthRequest, res: Response) => {
  try {
    const room = await roomService.getRoomByCode(req.params.code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json(room);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/join', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const room = await roomService.joinRoom(req.params.id, req.user!.userId);
    res.json(room);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/leave', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const room = await roomService.leaveRoom(req.params.id, req.user!.userId);
    res.json(room || { message: 'Room deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
