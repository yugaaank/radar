import * as coral from '../core/coral';
import { RadarItem } from '../core/types';
import * as cache from '../core/cache';
import { calculateRadarScore } from '../core/scorer';
import { sanitizeRaw } from '../core/sanitize';

const CACHE_KEY = 'github';
const TTL = 60 * 1000;

/**
 * Optimized GitHub Adapter (Canonical)
 */
export async function fetchGithubItems(options: { refresh?: boolean } = {}): Promise<RadarItem[]> {
  if (!options.refresh) {
    const cached = cache.getCache<RadarItem[]>(CACHE_KEY);
    if (cached) {
      console.log(`[cache] ${CACHE_KEY} hit`);
      return cached;
    }
  }
  console.log(`[cache] ${CACHE_KEY} miss`);

  const startTotal = performance.now();
  const items: RadarItem[] = [];

  try {
    // 1. Get auth context
    let owner = 'yugaaank';
    const userStart = performance.now();
    try {
      const userRes = await coral.runCoralQuery(`SELECT login FROM github.user LIMIT 1`);
      if (userRes?.[0]?.login) owner = userRes[0].login;
      console.log(`[github] user query ${Math.round(performance.now() - userStart)}ms`);
    } catch (e: any) {
      console.warn('[github] Failed to fetch user', e.message);
    }

    // 2. Parallel broad fetch
    const notifyStart = performance.now();
    const reposStart = performance.now();
    
    const [notificationsRes, reposRes] = await Promise.allSettled([
      coral.runCoralQuery(`
        SELECT subject__title, subject__type, reason, updated_at, repository__full_name 
        FROM github.notifications WHERE unread = true LIMIT 50
      `),
      coral.runCoralQuery(`
        SELECT name, pushed_at, html_url 
        FROM github.user_repos 
        WHERE pushed_at > now() - interval '30 days' 
        ORDER BY pushed_at DESC LIMIT 15
      `)
    ]);

    if (notificationsRes.status === 'fulfilled') {
      console.log(`[github] notifications query ${Math.round(performance.now() - notifyStart)}ms`);
      const notifications = notificationsRes.value;
      const ciFailures = notifications.filter((n: any) => 
        n.subject__type === 'CheckSuite' || n.subject__title.toLowerCase().includes('failed')
      );
      
      const seenRepos = new Set();
      for (const f of ciFailures) {
        if (seenRepos.has(f.repository__full_name)) continue;
        seenRepos.add(f.repository__full_name);
        
        const item: Partial<RadarItem> = {
          id: `gh-ci-${f.repository__full_name}`,
          source: 'github',
          entityType: 'ci',
          title: `Failed: ${f.subject__title}`,
          url: `https://github.com/${f.repository__full_name}/actions`,
          severity: 'critical',
          health: 'Overdue',
          urgencyScore: 0.05,
          impactScore: 5,
          confidenceScore: 1,
          category: 'engineering',
          updatedAt: f.updated_at,
          correlationKeys: [f.repository__full_name],
          tags: ['ci-failure'],
          raw: sanitizeRaw(f)
        };
        item.radarScore = calculateRadarScore(item);
        items.push(item as RadarItem);
      }

      const actionable = notifications.filter((n: any) => 
        n.subject__type === 'PullRequest' && ['mention', 'assign', 'review_requested'].includes(n.reason)
      );
      
      for (const n of actionable) {
        const item: Partial<RadarItem> = {
          id: `gh-notify-${n.repository__full_name}-${n.updated_at}`,
          source: 'github',
          entityType: 'pr',
          title: `[Review] ${n.subject__title}`,
          url: `https://github.com/${n.repository__full_name}`,
          severity: 'medium',
          health: 'Action Required',
          urgencyScore: 1,
          impactScore: 4,
          confidenceScore: 1,
          category: 'engineering',
          updatedAt: n.updated_at,
          correlationKeys: [n.repository__full_name],
          tags: [n.reason],
          raw: sanitizeRaw(n)
        };
        item.radarScore = calculateRadarScore(item);
        items.push(item as RadarItem);
      }
    }

    if (reposRes.status === 'fulfilled') {
      console.log(`[github] repos query ${Math.round(performance.now() - reposStart)}ms`);
      const repos = reposRes.value;
      for (const r of repos) {
        const item: Partial<RadarItem> = {
          id: `gh-repo-${r.name}`,
          source: 'github',
          entityType: 'issue', // Repos map to context issues/activity
          title: `Repo: ${r.name}`,
          url: r.html_url,
          severity: 'low',
          health: 'Healthy',
          urgencyScore: Math.max(7, Math.floor(Math.abs(Date.now() - new Date(r.pushed_at).getTime()) / (1000 * 60 * 60 * 24))),
          impactScore: 2,
          confidenceScore: 1,
          category: 'engineering',
          updatedAt: r.pushed_at,
          correlationKeys: [r.name],
          tags: ['activity'],
          raw: sanitizeRaw(r)
        };
        item.radarScore = calculateRadarScore(item);
        items.push(item as RadarItem);
      }

      if (repos.length > 0) {
        const topRepo = repos[0].name;
        const pullsStart = performance.now();
        try {
          const pulls = await coral.runCoralQuery(`
            SELECT title, html_url, updated_at 
            FROM github.pulls 
            WHERE owner = '${owner}' AND repo = '${topRepo}' AND state = 'open' 
            AND updated_at < now() - interval '7 days'
            LIMIT 5
          `);
          console.log(`[github] pulls query ${Math.round(performance.now() - pullsStart)}ms`);
          
          for (const p of pulls) {
            const item: Partial<RadarItem> = {
              id: `gh-pull-stale-${p.html_url}`,
              source: 'github',
              entityType: 'pr',
              title: `Stale: ${p.title} (${topRepo})`,
              url: p.html_url,
              severity: 'high',
              health: 'Stale',
              urgencyScore: Math.min(Math.floor(Math.abs(Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24)), 90),
              impactScore: 3,
              confidenceScore: 0.9,
              category: 'engineering',
              updatedAt: p.updated_at,
              correlationKeys: [topRepo],
              tags: ['stale'],
              raw: sanitizeRaw(p)
            };
            item.radarScore = calculateRadarScore(item);
            items.push(item as RadarItem);
          }
        } catch (e: any) {
          console.warn(`[github] Pulls query failed for ${topRepo}`, e.message);
        }
      }
    }

  } catch (error) {
    console.error('[github] Fatal aggregation error:', error);
  }

  const totalDuration = Math.round(performance.now() - startTotal);
  console.log(`[github] total ${totalDuration}ms`);

  const finalItems = items.slice(0, 20);
  cache.setCache(CACHE_KEY, finalItems, TTL);
  
  return finalItems;
}
