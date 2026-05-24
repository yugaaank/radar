import { RadarItem } from './types';

const TICKET_REGEX = /[A-Z]{2,}-\d+/g;
const SERVICE_KEYWORDS = [
  'auth-service', 'billing-api', 'payments', 'frontend', 'backend', 
  'deployment', 'checkout', 'notifications', 'infrastructure', 'database',
  'api', 'middleware', 'onboarding', 'security', 'login'
];

/**
 * Extract ticket-like patterns (ENG-123) from text.
 */
export function extractCorrelationKeys(text: string): string[] {
  if (!text) return [];
  const matches = text.match(TICKET_REGEX);
  return matches ? Array.from(new Set(matches.map(m => m.toUpperCase()))) : [];
}

/**
 * Infer system/service names from text based on a known list.
 */
export function inferServiceKeywords(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return SERVICE_KEYWORDS.filter(kw => lower.includes(kw));
}

/**
 * Main correlation engine logic.
 * Detects relationships across disparate sources.
 */
export function correlateItems(items: RadarItem[]): RadarItem[] {
  // 1. Initial extraction for each item
  for (const item of items) {
    const textToScan = [
      item.title,
      item.description,
      ...(item.tags || []),
      JSON.stringify(item.raw || {})
    ].join(' ');

    const keys = new Set([
      ...(item.correlationKeys || []),
      ...extractCorrelationKeys(textToScan),
      ...inferServiceKeywords(textToScan)
    ]);

    item.correlationKeys = Array.from(keys);
  }

  // 2. Pairwise comparison for linking
  for (let i = 0; i < items.length; i++) {
    const itemA = items[i];
    const relatedIds: string[] = [];
    const relatedSummaries: string[] = [];

    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const itemB = items[j];

      // Find overlap in correlation keys
      const overlap = itemA.correlationKeys.filter(k => itemB.correlationKeys.includes(k));

      if (overlap.length > 0) {
        relatedIds.push(itemB.id);
        relatedSummaries.push(`${itemB.source}: ${itemB.title}`);
        
        // 3. Confidence boost logic
        // If they share multiple keys, they are very likely related
        const boost = Math.min(15, overlap.length * 5);
        itemA.radarScore = Math.min(100, (itemA.radarScore || 0) + (boost / items.length)); // Distributed boost
      }
    }

    // 4. Update raw metadata with links
    if (relatedIds.length > 0) {
      itemA.raw = {
        ...itemA.raw,
        relatedItemIds: relatedIds,
        relatedItemsSummary: relatedSummaries.join(' | ')
      };
      
      // Modest score boost for being part of a cluster (+5 flat)
      itemA.radarScore = Math.min(100, (itemA.radarScore || 0) + 5);
    }
  }

  return items;
}
