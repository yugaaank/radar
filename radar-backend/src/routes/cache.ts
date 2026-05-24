import { Router } from 'express';
import * as cache from '../core/cache';

const router = Router();

router.get('/clear', (req, res) => {
  const key = req.query.key as string;
  try {
    cache.clearCache(key);
    res.json({ message: key ? `Cache cleared for ${key}` : 'All cache cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;
