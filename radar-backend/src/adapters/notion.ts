import * as coral from '../core/coral';
import { RadarItem } from '../core/types';
import { calculateRadarScore } from '../core/scorer';
import * as cache from '../core/cache';
import { sanitizeRaw } from '../core/sanitize';

const CACHE_KEY = 'notion';
const TTL = 120 * 1000;

function getPropertyValue(props: any, candidates: string[]): any {
  if (!props) return null;
  for (const key of candidates) {
    const prop = props[key];
    if (prop === undefined || prop === null) continue;
    switch (prop.type) {
      case 'select': return prop.select?.name;
      case 'status': return prop.status?.name;
      case 'checkbox': return prop.checkbox;
      case 'number': return prop.number;
      case 'date': return prop.date?.start;
      case 'multi_select': return prop.multi_select?.map((s: any) => s.name).join(', ');
      case 'rich_text': return prop.rich_text?.[0]?.plain_text;
      case 'title': return prop.title?.[0]?.plain_text;
      case 'url': return prop.url;
    }
  }
  return null;
}

function extractTitleFromUrl(url: string): string {
  try {
    const parts = url.split('/').pop()?.split('-');
    if (!parts || parts.length <= 1) return 'Untitled Page';
    return parts.slice(0, -1).join(' ');
  } catch {
    return 'Untitled Page';
  }
}

/**
 * Notion Adapter (Canonical)
 */
export async function fetchNotionItems(options: { refresh?: boolean } = {}): Promise<RadarItem[]> {
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
    const sql = `SELECT url, last_edited_time, properties, object FROM notion.search WHERE object = 'page' LIMIT 50`;
    const pages = await coral.runCoralQuery(sql);

    const now = new Date();

    for (const p of pages) {
      const props = p.properties || {};
      const rawTitle = getPropertyValue(props, ['Name', 'Title', 'Page']) || extractTitleFromUrl(p.url);
      const catRaw = getPropertyValue(props, ['Category', 'Domain', 'Type']) || 'docs';
      const impactRaw = getPropertyValue(props, ['Impact', 'Priority', 'Criticality']);
      const dueDate = getPropertyValue(props, ['Due Date', 'Deadline', 'Due']);
      const status = getPropertyValue(props, ['Status', 'State', 'Blocked', 'Blocked?']);
      
      const impactScore = typeof impactRaw === 'number' ? impactRaw : 
                     (impactRaw?.toLowerCase() === 'high' ? 5 : 
                      impactRaw?.toLowerCase() === 'medium' ? 3 : 2);
      
      const isBlocked = status && /blocked|stuck|waiting|needs review/i.test(String(status));
      const lastEdited = new Date(p.last_edited_time);
      const diffDays = Math.floor(Math.abs(now.getTime() - lastEdited.getTime()) / (1000 * 60 * 60 * 24));
      
      let severity: RadarItem['severity'] = 'low';
      if (isBlocked) severity = 'high';
      if (dueDate && new Date(dueDate).getTime() < now.getTime()) severity = 'critical';

      let category = 'docs';
      const c = catRaw.toLowerCase();
      if (c.includes('eng')) category = 'engineering';
      else if (c.includes('strat') || c.includes('biz')) category = 'business';

      const item: Partial<RadarItem> = {
        id: `no-page-${p.url}`,
        source: 'notion',
        entityType: 'doc',
        title: `Doc: ${rawTitle}`,
        url: p.url,
        severity,
        health: isBlocked ? 'Stuck' : (dueDate && new Date(dueDate).getTime() < now.getTime() ? 'Overdue' : 'Healthy'),
        urgencyScore: isBlocked ? 1 : (dueDate ? (new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : Math.min(diffDays, 90)),
        impactScore,
        confidenceScore: 0.9,
        category,
        updatedAt: p.last_edited_time,
        dueDate: dueDate || undefined,
        correlationKeys: [rawTitle.match(/[A-Z]+-\d+/)?.[0]].filter(Boolean) as string[],
        tags: [status].filter(Boolean),
        raw: sanitizeRaw(p)
      };

      item.radarScore = calculateRadarScore(item);
      items.push(item as RadarItem);
    }
  } catch (error) {
    console.error('Fatal error in Notion adapter:', error);
  }

  cache.setCache(CACHE_KEY, items, TTL);
  return items;
}
