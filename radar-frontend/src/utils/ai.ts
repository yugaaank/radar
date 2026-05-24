import { RadarItem } from "../components/radar-types";

/**
 * buildAIContext
 * 
 * Trims the radar dataset to prevent token blowup while preserving critical intelligence.
 * Identifies correlated clusters to provide a unified summary.
 */
export function buildAIContext(items: RadarItem[]): any[] {
  const MAX_ITEMS = 25;
  const MAX_DESC_LENGTH = 200;

  // 1. Group by correlation keys (Clusters)
  const clusters = new Map<string, RadarItem[]>();
  const independentItems: RadarItem[] = [];

  items.forEach(item => {
    const key = item.correlationKeys?.[0]; // Simplistic cluster grouping by first key
    if (key) {
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(item);
    } else {
      independentItems.push(item);
    }
  });

  // 2. Build summarized context
  const context: any[] = [];

  // Add clusters as unified entities
  clusters.forEach((clusterItems, key) => {
    if (context.length >= MAX_ITEMS) return;
    
    const topItem = [...clusterItems].sort((a, b) => (b.radarScore || 0) - (a.radarScore || 0))[0];
    
    context.push({
      type: 'cluster',
      clusterKey: key,
      mainTitle: topItem.title,
      itemCount: clusterItems.length,
      severity: topItem.severity,
      radarScore: Math.max(...clusterItems.map(i => i.radarScore || 0)),
      summary: `Cluster of ${clusterItems.length} items related to ${key}. Includes: ${clusterItems.map(i => i.title).join(', ').substring(0, 100)}...`
    });
  });

  // Add high-priority independent items
  const remainingSpace = MAX_ITEMS - context.length;
  if (remainingSpace > 0) {
    const topIndependent = independentItems
      .sort((a, b) => (b.radarScore || 0) - (a.radarScore || 0))
      .slice(0, remainingSpace);

    topIndependent.forEach(item => {
      context.push({
        id: item.id,
        source: item.source,
        entityType: item.entityType,
        title: item.title,
        description: item.description 
          ? (item.description.length > MAX_DESC_LENGTH 
              ? item.description.substring(0, MAX_DESC_LENGTH) + '...' 
              : item.description)
          : undefined,
        severity: item.severity,
        health: item.health,
        radarScore: item.radarScore,
        category: item.category,
        owner: item.owner
      });
    });
  }

  return context;
}
