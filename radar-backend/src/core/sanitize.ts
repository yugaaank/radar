/**
 * Backend Sanitization Utility
 * Whitelists only safe fields from raw API payloads to prevent PII or token leakage.
 */
export function sanitizeRaw(raw: any): Record<string, any> {
  if (!raw || typeof raw !== 'object') return {};

  const whitelistedKeys = [
    // General
    'id', 'name', 'status', 'priority', 'type', 'url', 'html_url',
    'created_at', 'updated_at', 'pushed_at', 'due_date', 'date_updated',
    
    // GitHub
    'full_name', 'conclusion', 'head_branch', 'subject__title', 'subject__type', 'reason',
    
    // ClickUp
    'list__name', 'project__name', 'folder__name',
    
    // Notion
    'object', 'last_edited_time',
    
    // Logic keys
    'relatedItemIds', 'relatedItemsSummary'
  ];

  const sanitized: Record<string, any> = {};

  for (const key of whitelistedKeys) {
    if (raw[key] !== undefined) {
      // If the value is a complex object, don't spread it unless it's known safe
      // For now, only primitives or already-normalized fields are allowed
      if (typeof raw[key] !== 'object' || raw[key] === null) {
        sanitized[key] = raw[key];
      }
    }
  }

  return sanitized;
}
