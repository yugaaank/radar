import { RadarItem } from './types';

export function severityWeight(severity: RadarItem['severity']): number {
  switch (severity) {
    case 'critical': return 100;
    case 'high': return 75;
    case 'medium': return 45;
    case 'low': return 20;
    default: return 20;
  }
}

export function stalenessWeight(updatedAt?: string): number {
  if (!updatedAt) return 0;
  const days = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  // Staleness increases score moderately: 1 point per day, max 30
  return Math.min(30, Math.max(0, days));
}

export function urgencyWeight(dueDate?: string, urgencyScore?: number): number {
  // If we have a past-due date, that's max urgency
  if (dueDate) {
    const diff = (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff <= 0) return 100;
    // Scaled urgency for upcoming items (closer = higher)
    if (diff < 7) return 100 - (diff * 10); // 100 down to 30
  }
  
  // Fallback to the approximate distance/days if provided
  if (urgencyScore !== undefined) {
    if (urgencyScore <= 0.1) return 100;
    if (urgencyScore < 1) return 90;
    if (urgencyScore < 7) return 70;
    if (urgencyScore < 30) return 40;
    return 10;
  }

  return 20;
}

export function impactWeight(impactScore: number): number {
  // Normalize 1-5 scale to 0-100
  return Math.min(100, Math.max(0, impactScore * 20));
}

export function confidenceWeight(confidenceScore: number): number {
  return Math.min(100, Math.max(0, confidenceScore * 100));
}

/**
 * calculateRadarScore
 * Formula:
 * urgency 40%
 * impact 25%
 * severity 20%
 * staleness 10%
 * confidence 5%
 * 
 * Returns 0-100
 */
export function calculateRadarScore(item: Partial<RadarItem>): number {
  const u = urgencyWeight(item.dueDate, item.urgencyScore) * 0.40;
  const i = impactWeight(item.impactScore || 1) * 0.25;
  const s = severityWeight(item.severity || 'low') * 0.20;
  const st = stalenessWeight(item.updatedAt) * 0.10;
  const c = confidenceWeight(item.confidenceScore || 1) * 0.05;

  return Math.round(u + i + s + st + c);
}

// Keep legacy for now during migration
export function calculateDistance(dueDate: string | null, impact: number = 1, importance: number = 1, isBlocked: boolean = false) {
  if (!dueDate) return 30;
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);
  if (diffDays <= 0) return 0.1;
  let score = diffDays;
  if (impact > 3) score *= 0.8;
  if (importance > 3) score *= 0.8;
  if (isBlocked && diffDays < 3) score = Math.max(0.5, score);
  return score;
}
