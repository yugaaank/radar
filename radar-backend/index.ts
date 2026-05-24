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
    const { stdout, stderr } = await execPromise(`coral sql --format json "${sql.replace(/"/g, '\\"')}"`);
    if (stderr) console.error('Coral stderr:', stderr);
    return JSON.parse(stdout);
  } catch (error) {
    console.error('Execution error for SQL:', sql);
    throw error;
  }
}

async function getActiveSources() {
  const { stdout } = await execPromise('coral source list');
  return stdout.split('\n')
    .slice(2)
    .filter(line => line.trim())
    .map(line => line.split(/\s+/)[0]);
}

app.get('/api/workspace-radar', async (req, res) => {
  try {
    const sources = await getActiveSources();
    const results: any[] = [];

    for (const source of sources) {
      if (source === 'github') {
        try {
          // 1. Get Active Repositories (pushed in last 60 days)
          const repos = await runCoralQuery(`
            SELECT name, owner__login 
            FROM github.user_repos 
            WHERE pushed_at > now() - interval '60 days'
            LIMIT 5
          `);

          for (const repo of repos) {
            // 2. Fetch Pull Requests with Maintenance Metadata
            const pullsSql = `
              SELECT 
                title, html_url, updated_at, created_at,
                mergeable_state, requested_reviewer_logins,
                'PR' as type, '${repo.name}' as repo
              FROM github.pulls 
              WHERE owner = '${repo.owner__login}' AND repo = '${repo.name}' AND state = 'open'
            `;
            
            // 3. Fetch Issues with Maintenance Metadata
            const issuesSql = `
              SELECT 
                title, html_url, updated_at,
                milestone__due_on, labels, assignees,
                'Issue' as type, '${repo.name}' as repo
              FROM github.issues 
              WHERE owner = '${repo.owner__login}' AND repo = '${repo.name}' AND state = 'open' AND pull_request IS NULL
            `;

            try {
              const [pulls, issues] = await Promise.all([
                runCoralQuery(pullsSql),
                runCoralQuery(issuesSql)
              ]);

              // Process Pull Requests
              results.push(...pulls.map((p: any) => {
                let health: any = 'Healthy';
                let distance = Math.floor(Math.abs(Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24));
                
                if (p.mergeable_state === 'dirty') health = 'Overdue'; // Conflicts
                else if (p.requested_reviewer_logins) health = 'Action Required'; // Waiting for review
                else if (distance > 14) health = 'Stale';

                return {
                  title: `PR: ${p.title} (${repo.name})`,
                  html_url: p.html_url,
                  updated_at: p.updated_at,
                  source: 'GitHub',
                  subject: 'PR',
                  health,
                  distance: health === 'Overdue' ? 0.2 : distance,
                  priority: p.mergeable_state === 'dirty' ? 'Critical' : 'Normal'
                };
              }));

              // Process Issues
              results.push(...issues.map((i: any) => {
                let health: any = 'Healthy';
                let distance = 30; // Default

                if (i.milestone__due_on) {
                  distance = Math.floor((new Date(i.milestone__due_on).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  if (distance < 0) health = 'Overdue';
                  else if (distance < 3) health = 'Action Required';
                }

                if (i.labels?.toLowerCase().includes('critical') || i.labels?.toLowerCase().includes('bug')) {
                   health = 'Overdue';
                   distance = 0.5;
                }

                return {
                  title: `Issue: ${i.title} (${repo.name})`,
                  html_url: i.html_url,
                  updated_at: i.updated_at,
                  source: 'GitHub',
                  subject: 'Action',
                  health,
                  distance: Math.max(0.1, distance),
                  priority: i.labels || 'None'
                };
              }));
            } catch (err) { console.warn(`Failed to scan repo ${repo.name}`, err); }
          }

          // 4. Add CI Failures from notifications for speed
          const failSql = `SELECT subject__title, repository__full_name FROM github.notifications WHERE unread = true AND subject__type = 'CheckSuite' LIMIT 5`;
          const fails = await runCoralQuery(failSql);
          results.push(...fails.map((f: any) => ({
             title: `CI FAILURE: ${f.subject__title}`,
             html_url: `https://github.com/${f.repository__full_name}/actions`,
             updated_at: new Date().toISOString(),
             source: 'GitHub',
             subject: 'CI Failure',
             health: 'Overdue',
             distance: 0.05
          })));

        } catch (e) { console.warn('GitHub maintenance scan failed', e); }
      }
      
      if (source === 'clickup') {
        try {
          const teams = await runCoralQuery(`SELECT id FROM clickup.team LIMIT 1`);
          if (teams && teams.length > 0) {
            const teamId = teams[0].id;
            const sql = `
              SELECT 
                'ClickUp' as source, 
                name as title, 
                list__name as subject,
                status as status,
                COALESCE(from_unixtime(CAST(due_date AS BIGINT) / 1000), from_unixtime(CAST(date_updated AS BIGINT) / 1000)) as updated_at, 
                url as html_url,
                CASE 
                  WHEN due_date IS NOT NULL AND due_date != '' AND CAST(due_date AS BIGINT) < EXTRACT(EPOCH FROM now()) * 1000 THEN 'Overdue'
                  WHEN status LIKE '%"type":"unresolved"%' AND (now() - from_unixtime(CAST(date_updated AS BIGINT) / 1000)) > interval '7 days' THEN 'Stuck'
                  ELSE 'Healthy'
                END as health,
                CASE 
                  WHEN due_date IS NULL OR due_date = '' THEN 45
                  ELSE GREATEST(0, EXTRACT(DAY FROM (from_unixtime(CAST(due_date AS BIGINT) / 1000) - now())))
                END as distance
              FROM clickup.team_task 
              WHERE "team_Id" = ${teamId} AND status NOT LIKE '%"type":"closed"%'
            `;
            const data = await runCoralQuery(sql);
            results.push(...data);
          }
        } catch (e) { console.warn('ClickUp query failed', e); }
      }
    }
    res.json(results);
  } catch (err) {
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
    link: "https://github.com/settings/tokens/new?scopes=repo,read:org,user,notifications&description=Radar%20Integration",
    instructions: "Generate a 'Classic' Personal Access Token. We need 'repo', 'read:org', 'user', and 'notifications' scopes."
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
    res.json({ name, inputs, guide: SOURCE_GUIDES[name as keyof typeof SOURCE_GUIDES] });
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
