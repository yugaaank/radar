import { RadarItem } from "../components/radar-types";

/**
 * Deterministic numeric hash for stable positioning.
 */
export const getNumericHash = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = Math.abs(hash & hash);
  }
  return hash;
};
