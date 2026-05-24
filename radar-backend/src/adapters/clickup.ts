import * as coral from '../core/coral';
import { RadarItem } from '../core/types';
import { calculateRadarScore } from '../core/scorer';
import * as cache from '../core/cache';
import { sanitizeRaw } from '../core/sanitize';

const CACHE_KEY = 'clickup';
const TTL = 30 * 1000;

/**
 * ClickUp Adapter (Canonical)
 */
export async function fetchClickupItems(options: { refresh?: boolean } = {}): Promise<RadarItem[]> {
  if (!options.refresh) {
    const cached = cache.getCache<RadarItem[]>(CACHE_KEY);
    if (cached) {
      console.log(`[cache] ${CACHE_KEY} hit`);
      return cached;
    }
  }
  console.log(`[cache] ${CACHE_KEY} miss (refresh=${!!options.refresh})`);

  const items: RadarItem[] = [];

  try {
    const teams = await coral.runCoralQuery(`SELECT id FROM clickup.team LIMIT 1`);
    if (!teams || teams.length === 0) return [];
    const teamId = teams[0].id;

    const sql = `
      SELECT 
        name as title, list__name as subject, status,
        due_date, date_updated, url as html_url, priority
      FROM clickup.team_task 
      WHERE "team_Id" = ${teamId} AND status NOT LIKE '%"type":"closed"%'
      LIMIT 50
    `;
    const tasks = await coral.runCoralQuery(sql);

    const now = Date.now();

    for (const t of tasks) {
      const pLevel = t.priority?.toLowerCase() || 'normal';
      const statusLower = t.status?.toLowerCase() || '';
      const listLower = t.subject?.toLowerCase() || '';
      
      const priorityMap: Record<string, number> = { 'urgent': 5, 'high': 4, 'normal': 3, 'low': 2 };
      const impactScore = priorityMap[pLevel] || 3;
      const dueDate = t.due_date ? new Date(parseInt(t.due_date)).toISOString() : undefined;
      const updatedAt = new Date(parseInt(t.date_updated)).toISOString();

      let category = 'tasks';
      if (/dev|engineering|backend|frontend/.test(listLower)) category = 'engineering';
      else if (/docs|writing|strategy/.test(listLower)) category = 'docs';
      else if (/learning|study|physics|chem|math/.test(listLower)) category = 'docs';

      let severity: RadarItem['severity'] = 'low';
      if (pLevel === 'urgent') severity = 'critical';
      else if (pLevel === 'high') severity = 'high';
      else if (pLevel === 'normal') severity = 'medium';

      const isOverdue = dueDate && new Date(dueDate).getTime() < now;
      const isBlocked = statusLower.includes('blocked') || statusLower.includes('stuck') || statusLower.includes('waiting');

      const item: Partial<RadarItem> = {
        id: `cu-task-${t.html_url}`,
        source: 'clickup',
        entityType: 'task',
        title: t.title,
        url: t.html_url,
        severity,
        health: isOverdue ? 'Overdue' : (isBlocked ? 'Stuck' : 'Healthy'),
        urgencyScore: isOverdue ? 0.1 : (isBlocked ? 1 : (dueDate ? (new Date(dueDate).getTime() - now) / (1000 * 60 * 60 * 24) : 30)),
        impactScore,
        confidenceScore: 1,
        category,
        updatedAt,
        dueDate,
        correlationKeys: [t.subject, t.title.match(/[A-Z]+-\d+/)?.[0]].filter(Boolean) as string[],
        tags: [t.status, t.priority].filter(Boolean),
        raw: sanitizeRaw(t)
      };
      
      item.radarScore = calculateRadarScore(item);
      items.push(item as RadarItem);
    }

  } catch (error) {
    console.error('Fatal error in ClickUp adapter:', error);
  }

  cache.setCache(CACHE_KEY, items, TTL);
  return items;
}
