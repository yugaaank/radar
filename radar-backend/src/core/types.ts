export interface RadarItem {
  id: string;

  source:
    | "github"
    | "clickup"
    | "notion"
    | "jira"
    | "slack"
    | "datadog"
    | "pagerduty"
    | "sentry"
    | "linear";

  entityType:
    | "task"
    | "incident"
    | "alert"
    | "error"
    | "doc"
    | "pr"
    | "issue"
    | "message"
    | "deployment"
    | "metric";

  title: string;
  description?: string;
  url?: string;

  severity:
    | "low"
    | "medium"
    | "high"
    | "critical";

  health:
    | "healthy"
    | "warning"
    | "blocked"
    | "critical"
    | "stale";

  urgencyScore: number;
  impactScore: number;
  confidenceScore: number;
  radarScore: number;

  category:
    | "engineering"
    | "ops"
    | "tasks"
    | "docs"
    | "product"
    | "customer"
    | "business";

  owner?: string;
  team?: string;
  tags: string[];

  createdAt?: string;
  updatedAt?: string;
  dueDate?: string;

  correlationKeys: string[];
  raw: Record<string, unknown>;
}

// Internal interface for the current frontend compatibility
export interface LegacyRadarItem {
  source: 'GitHub' | 'ClickUp' | 'Slack' | 'Notion';
  title: string;
  updated_at: string;
  html_url: string;
  distance: number;
  subject?: string;
  category?: 'Finance' | 'Engineering' | 'Learning' | 'Admin' | 'Health' | 'Strategy';
  health: 'Healthy' | 'Overdue' | 'Stuck' | 'Stale' | 'Active' | 'Action Required';
  priority?: string | number;
  impact?: number;
  isBlocked?: boolean;
}
