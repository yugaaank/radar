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

// Utility to calculate urgency score based on various factors
function calculateDistance(dueDate: string | null, impact: number = 1, importance: number = 1, isBlocked: boolean = false) {
  if (!dueDate) return 30; // Default to 1 month ring
  
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);
  
  if (diffDays <= 0) return 0.1; // Immediate/Overdue
  
  // Weights for decision relevance
  // Closer = more urgent
  let score = diffDays;
  
  // High impact pulls it closer
  if (impact > 3) score *= 0.8;
  if (importance > 3) score *= 0.8;
  
  // Blocked urgent tasks still matter (stay somewhat close)
  if (isBlocked && diffDays < 3) score = Math.max(0.5, score);
  
  return score;
}

app.get('/api/workspace-radar', async (req, res) => {
  try {
    const sources = await getActiveSources();
    const results: any[] = [];

    for (const source of sources) {
      if (source === 'github') {
        try {
          // Actionable Items: Using notifications for failures and mentions
          const notifySql = `SELECT subject__title as title, subject__type as type, updated_at, repository__full_name as repo FROM github.notifications WHERE unread = true LIMIT 10`;
          const activeReposSql = `SELECT name, pushed_at as updated_at, html_url FROM github.user_repos WHERE pushed_at > now() - interval '30 days' LIMIT 5`;

          const [notifications, activeRepos] = await Promise.all([
            runCoralQuery(notifySql),
            runCoralQuery(activeReposSql)
          ]);

          results.push(...notifications.map((n: any) => ({
            title: `[${n.type}] ${n.title}`,
            html_url: `https://github.com/${n.repo}`,
            updated_at: n.updated_at,
            source: 'GitHub',
            subject: n.type === 'CheckSuite' ? 'CI Failure' : 'PR',
            category: 'Engineering',
            health: n.type === 'CheckSuite' ? 'Overdue' : 'Action Required',
            distance: n.type === 'CheckSuite' ? 0.05 : 1,
            impact: n.type === 'CheckSuite' ? 5 : 3
          })));

          results.push(...activeRepos.map((r: any) => ({
            title: `Repo: ${r.name}`,
            html_url: r.html_url,
            updated_at: r.updated_at,
            source: 'GitHub',
            subject: 'Activity',
            category: 'Engineering',
            health: 'Healthy',
            distance: Math.max(3, Math.floor(Math.abs(Date.now() - new Date(r.updated_at).getTime()) / (1000 * 60 * 60 * 24))),
            impact: 2
          })));
        } catch (e) { console.warn('GitHub aggregation failed', e); }
      }
      
      if (source === 'clickup') {
        try {
          const teams = await runCoralQuery(`SELECT id FROM clickup.team LIMIT 1`);
          if (teams && teams.length > 0) {
            const teamId = teams[0].id;
            const sql = `
              SELECT 
                name as title, list__name as subject, status as status,
                due_date, date_updated, url as html_url, priority as priority
              FROM clickup.team_task 
              WHERE "team_Id" = ${teamId} AND status NOT LIKE '%"type":"closed"%'
            `;
            const data = await runCoralQuery(sql);
            results.push(...data.map((t: any) => {
               const priorityMap: any = { 'urgent': 5, 'high': 4, 'normal': 3, 'low': 2 };
               const pLevel = t.priority?.toLowerCase() || 'normal';
               const impact = priorityMap[pLevel] || 3;
               const dueDate = t.due_date ? new Date(parseInt(t.due_date)).toISOString() : null;
               
               // Map ClickUp lists to Radar Categories
               let category = 'Admin';
               const s = t.subject?.toLowerCase() || '';
               if (s.includes('math') || s.includes('chem') || s.includes('physic')) category = 'Learning';
               else if (s.includes('eng') || s.includes('dev')) category = 'Engineering';

               return {
                 title: t.title,
                 source: 'ClickUp',
                 updated_at: new Date(parseInt(t.date_updated)).toISOString(),
                 html_url: t.html_url,
                 subject: t.subject,
                 category,
                 impact,
                 health: dueDate && new Date(dueDate).getTime() < Date.now() ? 'Overdue' : 'Healthy',
                 distance: calculateDistance(dueDate, impact),
                 priority: t.priority
               };
            }));
          }
        } catch (e) { console.warn('ClickUp query failed', e); }
      }

      if (source === 'notion') {
        try {
          // Deep search in Notion properties for Decision Metadata
          const sql = `SELECT url, last_edited_time, properties FROM notion.search LIMIT 20`;
          const pages = await runCoralQuery(sql);
          
          results.push(...pages.map((p: any) => {
            const props = p.properties || {};
            
            // Helper to get Notion property value safely
            const getProp = (name: string) => {
               const prop = props[name];
               if (!prop) return null;
               if (prop.type === 'select') return prop.select?.name;
               if (prop.type === 'number') return prop.number;
               if (prop.type === 'date') return prop.date?.start;
               if (prop.type === 'checkbox') return prop.checkbox;
               if (prop.type === 'multi_select') return prop.multi_select?.map((s: any) => s.name).join(', ');
               return null;
            };

            const title = p.url.split('/').pop()?.split('-').slice(0, -1).join(' ') || 'Untitled Page';
            const category = getProp('Category') || 'Strategy';
            const impact = getProp('Impact') || 3;
            const dueDate = getProp('Due Date');
            const isBlocked = getProp('Blocked?') === true;

            return {
              title: `Notion: ${title}`,
              html_url: p.url,
              updated_at: p.last_edited_time,
              source: 'Notion',
              subject: 'Documentation',
              category: category as any,
              impact: impact as number,
              health: isBlocked ? 'Stuck' : (dueDate && new Date(dueDate).getTime() < Date.now() ? 'Overdue' : 'Healthy'),
              distance: calculateDistance(dueDate, impact, 3, isBlocked),
              isBlocked,
              priority: getProp('Priority')
            };
          }));
        } catch (e) { console.warn('Notion query failed', e); }
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
