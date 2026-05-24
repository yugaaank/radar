import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

async function runCoralQuery(sql: string) {
  try {
    // We use --format json for easy parsing
    const { stdout, stderr } = await execPromise(`coral sql --format json "${sql.replace(/"/g, '\\"')}"`);
    if (stderr) console.error('Coral stderr:', stderr);
    return JSON.parse(stdout);
  } catch (error) {
    console.error('Execution error:', error);
    throw error;
  }
}

app.get('/api/stale-prs', async (req, res) => {
  const { owner = 'facebook', repo = 'react' } = req.query;
  const sql = `
    SELECT title, user__login as author, updated_at, html_url 
    FROM github.pulls 
    WHERE owner = '${owner}' AND repo = '${repo}' AND state = 'open' 
      AND updated_at < now() - interval '7 days'
    ORDER BY updated_at ASC LIMIT 10
  `;
  try {
    const data = await runCoralQuery(sql);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stale PRs' });
  }
});

async function getActiveSources() {
  const { stdout } = await execPromise('coral source list');
  // Simple parser for the 'coral source list' output table
  return stdout.split('\n')
    .slice(2) // Skip header and separator
    .filter(line => line.trim())
    .map(line => line.split(/\s+/)[0]);
}

app.get('/api/workspace-radar', async (req, res) => {
  try {
    const sources = await getActiveSources();
    const results: any[] = [];

    for (const source of sources) {
      if (source === 'github') {
        // Universal GitHub view: All open PRs and issues across your repos
        const sql = `
          SELECT 
            'GitHub' as source, 
            title, 
            updated_at, 
            html_url,
            EXTRACT(DAY FROM (now() - CAST(updated_at AS TIMESTAMP))) as distance,
            CASE 
              WHEN updated_at < now() - interval '14 days' THEN 'Stale'
              ELSE 'Active'
            END as health
          FROM github.issues 
          WHERE state = 'open'
          LIMIT 50
        `;
        try {
          const data = await runCoralQuery(sql);
          results.push(...data);
        } catch (e) { console.warn('GitHub query failed', e); }
      }
      
      if (source === 'clickup') {
        try {
          const teams = await runCoralQuery(`SELECT id FROM clickup.team LIMIT 1`);
          if (teams && teams.length > 0) {
            const teamId = teams[0].id;
            // Universal ClickUp view: All active tasks with priority and health checks
            const sql = `
              SELECT 
                'ClickUp' as source, 
                name as title, 
                list__name as subject,
                status__status as status,
                COALESCE(from_unixtime(CAST(due_date AS BIGINT) / 1000), from_unixtime(CAST(date_updated AS BIGINT) / 1000)) as updated_at, 
                url as html_url,
                priority__priority as priority,
                CASE 
                  WHEN due_date IS NOT NULL AND CAST(due_date AS BIGINT) < EXTRACT(EPOCH FROM now()) * 1000 THEN 'Overdue'
                  WHEN status__type = 'unresolved' AND (now() - from_unixtime(CAST(date_updated AS BIGINT) / 1000)) > interval '7 days' THEN 'Stuck'
                  ELSE 'Healthy'
                END as health,
                CASE 
                  WHEN due_date IS NULL OR due_date = '' THEN 45 -- Further out if no deadline
                  ELSE GREATEST(0, EXTRACT(DAY FROM (from_unixtime(CAST(due_date AS BIGINT) / 1000) - now())))
                END as distance
              FROM clickup.team_task 
              WHERE "team_Id" = ${teamId} AND status__type != 'closed'
            `;
            const data = await runCoralQuery(sql);
            results.push(...data);
          }
        } catch (e) { 
          console.warn('ClickUp query failed', e); 
        }
      }
    }

    res.json(results);
  } catch (err) {
    console.error('Workspace aggregation error:', err);
    res.status(500).json({ error: 'Failed to aggregate workspace radar' });
  }
});

app.get('/api/sources/available', async (req, res) => {
  try {
    const { stdout } = await execPromise('coral source discover');
    const sources = stdout.split('\n')
      .slice(2)
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(/\s+/);
        return { name: parts[0], version: parts[1], status: parts[2] };
      });
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: 'Failed to discover sources' });
  }
});

const SOURCE_GUIDES: Record<string, { link: string; instructions: string }> = {
  github: {
    link: "https://github.com/settings/tokens/new?scopes=repo,read:org,user&description=Radar%20Integration",
    instructions: "Generate a 'Classic' Personal Access Token. We need 'repo', 'read:org', and 'user' scopes."
  },
  slack: {
    link: "https://api.slack.com/apps",
    instructions: "Create an app, enable 'channels:read', 'groups:read', and 'im:read' under User Token Scopes, then install to workspace."
  },
  jira: {
    link: "https://id.atlassian.com/manage-profile/security/api-tokens",
    instructions: "Generate an API token. You'll also need your Atlassian Email and Site URL (e.g., yourcompany.atlassian.net)."
  },
  notion: {
    link: "https://www.notion.so/my-integrations",
    instructions: "Create a 'New integration' and copy the Internal Integration Token. Ensure it has 'Read content' access."
  },
  clickup: {
    link: "https://app.clickup.com/settings/apps",
    instructions: "Scroll to 'API Token' and click 'Generate'. Copy the token to link your ClickUp workspaces."
  },
  linear: {
    link: "https://linear.app/settings/api",
    instructions: "Create a new 'Personal Access Token', name it 'Radar', and copy the key."
  },
  datadog: {
    link: "https://app.datadoghq.com/organization-settings/api-keys",
    instructions: "You need an API Key and an Application Key from Organization Settings -> API Keys."
  }
};

app.get('/api/sources/info/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const { stdout } = await execPromise(`coral source info ${name}`);
    const inputs: any[] = [];
    const lines = stdout.split('\n');
    let inInputs = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Inputs')) { inInputs = true; continue; }
      if (inInputs && lines[i].trim() && !lines[i].startsWith('    ')) break;
      if (inInputs && lines[i].trim()) {
        const match = lines[i].match(/^\s+([A-Z_]+)\s+\(([^)]+)\)/);
        if (match) {
          inputs.push({
            key: match[1],
            type: match[2],
            required: match[2].includes('required'),
            description: lines[i+1]?.trim().startsWith('default:') ? '' : lines[i+1]?.trim()
          });
        }
      }
    }
    res.json({ 
      name, 
      inputs, 
      guide: SOURCE_GUIDES[name as keyof typeof SOURCE_GUIDES] 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get source info' });
  }
});

app.post('/api/sources/add', async (req, res) => {
  const { name, inputs } = req.body;
  try {
    const env = { ...process.env, ...inputs };
    await execPromise(`coral source add ${name}`, { env });
    const { stdout: testOut, stderr: testErr } = await execPromise(`coral source test ${name}`, { env });
    
    if (testErr && !testOut.includes('connected successfully')) {
      throw new Error(testErr);
    }
    res.json({ message: 'Source connected and verified successfully!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Verification failed. Please check your inputs.' });
  }
});

app.listen(port, () => {
  console.log(`Radar backend listening at http://localhost:${port}`);
});
