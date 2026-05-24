# Radar SQL Library

This library contains the core intelligence queries used by Radar to generate insights across data sources.

## GitHub Intelligence

### 1. Stale Pull Requests
Finds open PRs that haven't been updated in more than 7 days.
```sql
SELECT 
    base__repo__full_name as repo,
    title,
    user__login as author,
    updated_at,
    html_url
FROM github.pulls
WHERE state = 'open' 
  AND owner = 'yugaaank'
  AND updated_at < date_sub(now(), interval '7 days')
ORDER BY updated_at ASC;
```

### 2. Review Bottlenecks
Identifies reviewers who have many pending PRs assigned to them.
```sql
SELECT 
    requested_reviewer_logins as reviewer,
    count(*) as pending_reviews
FROM github.pulls
WHERE state = 'open'
  AND owner = 'yugaaank'
  AND requested_reviewer_logins IS NOT NULL
GROUP BY requested_reviewer_logins
HAVING count(*) > 1
ORDER BY pending_reviews DESC;
```

### 3. Recent Activity Feed
Unified feed of recent updates across repos.
```sql
SELECT 
    'PR' as type,
    base__repo__full_name as repo,
    title,
    updated_at
FROM github.pulls
WHERE owner = 'yugaaank'
UNION ALL
SELECT 
    'ISSUE' as type,
    repository__full_name as repo,
    title,
    updated_at
FROM github.issues
WHERE owner = 'yugaaank'
ORDER BY updated_at DESC
LIMIT 20;
```

## Cross-Source Joins (Conceptual)
*Note: Requires Jira/Slack sources to be installed.*

### 4. Zombie Tasks (Jira + GitHub)
Finds Jira tasks in progress with no recent GitHub activity.
```sql
SELECT 
    j.key, j.summary, j.assignee, g.updated_at as last_commit
FROM jira.issues j
JOIN github.commits g ON j.key = g.message -- Assuming Jira key is in commit message
WHERE j.status = 'In Progress'
  AND g.author_name = j.assignee_name
  AND g.committed_date < date_sub(now(), interval '2 days');
```
