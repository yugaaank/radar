import { Router } from 'express';
import * as coral from '../core/coral';
import { fetchGithubItems } from '../adapters/github';
import { fetchClickupItems } from '../adapters/clickup';
import { fetchNotionItems } from '../adapters/notion';
import { RadarItem } from '../core/types';
import { correlateItems } from '../core/correlations';

const router = Router();

router.get('/workspace-radar', async (req, res) => {
  const startTotal = performance.now();
  const forceRefresh = req.query.refresh === 'true';
  const sourceStatus: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  try {
    const sources = await coral.getActiveSources();
    
    const adapterPromises = sources.map(async (source) => {
      const start = performance.now();
      try {
        let items: RadarItem[] = [];
        if (source === 'github') items = await fetchGithubItems({ refresh: forceRefresh });
        else if (source === 'clickup') items = await fetchClickupItems({ refresh: forceRefresh });
        else if (source === 'notion') items = await fetchNotionItems({ refresh: forceRefresh });
        
        const duration = Math.round(performance.now() - start);
        console.log(`[workspace] ${source} completed in ${duration}ms`);
        sourceStatus[source] = { status: 'ok', latencyMs: duration };
        return items;
      } catch (error: any) {
        const duration = Math.round(performance.now() - start);
        console.error(`[workspace] ${source} failed in ${duration}ms:`, error.message || error);
        sourceStatus[source] = { status: 'failed', error: error.message || String(error), latencyMs: duration };
        return []; // Return empty instead of throwing to keep other sources alive
      }
    });

    const results = await Promise.all(adapterPromises);
    let aggregatedItems = results.flat();

    // Run correlation engine to link disparate items
    aggregatedItems = correlateItems(aggregatedItems);

    const totalDuration = Math.round(performance.now() - startTotal);
    console.log(`[workspace] total aggregation ${totalDuration}ms`);

    res.json({
      items: aggregatedItems,
      sourceStatus,
      totalDurationMs: totalDuration
    });
  } catch (err) {
    console.error('[workspace] Critical aggregation failure:', err);
    res.status(500).json({ error: 'Failed to aggregate workspace radar' });
  }
});

export default router;
