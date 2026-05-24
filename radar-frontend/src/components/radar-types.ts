export interface RadarItem {
  id: string;
  source: string;
  entityType: string;
  title: string;
  description?: string;
  url?: string;
  severity: "low" | "medium" | "high" | "critical";
  health: string;
  urgencyScore: number;
  impactScore: number;
  confidenceScore: number;
  radarScore: number;
  category: string;
  owner?: string;
  team?: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  dueDate?: string;
  correlationKeys: string[];
  raw: Record<string, unknown>;
}

export interface SourceStatus {
  status: 'ok' | 'failed' | 'timeout';
  latencyMs?: number;
  error?: string;
}

export interface WorkspaceResponse {
  items: RadarItem[];
  sourceStatus: Record<string, SourceStatus>;
  totalDurationMs: number;
}

export const CANONICAL_CATEGORIES = ['engineering', 'ops', 'tasks', 'docs', 'product', 'customer', 'business'];

export const CATEGORY_ANGLES: Record<string, { start: number, end: number }> = {};
CANONICAL_CATEGORIES.forEach((cat, i) => {
  const sectorSize = 360 / CANONICAL_CATEGORIES.length;
  CATEGORY_ANGLES[cat] = { start: i * sectorSize, end: (i + 1) * sectorSize };
});
