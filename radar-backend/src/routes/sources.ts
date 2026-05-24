import { Router } from 'express';
import * as coral from '../core/coral';

const router = Router();

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

router.get('/available', async (req, res) => {
  try {
    const sources = await coral.discoverSources();
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: 'Failed to discover sources' });
  }
});

router.get('/info/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const info = await coral.getSourceInfo(name);
    res.json({ ...info, guide: SOURCE_GUIDES[name as keyof typeof SOURCE_GUIDES] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get source info' });
  }
});

router.post('/add', async (req, res) => {
  const { name, inputs } = req.body;
  try {
    await coral.addSource(name, inputs);
    res.json({ message: 'Source connected and verified successfully!' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Verification failed. Please check your inputs.' });
  }
});

export default router;
